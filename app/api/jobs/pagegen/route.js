import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { generateAiContent } from '@/lib/ai/generateContent';
import { getSystemPrompt, buildPagePrompt } from '@/lib/ai/promptTemplates';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';
import crypto from 'crypto';

export const maxDuration = 60; // Max time on Vercel
export const dynamic = 'force-dynamic';

export async function POST(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.QSTASH_TOKEN}`) {
        return NextResponse.json({ error: 'Unauthorized QStash Hook' }, { status: 401 });
    }

    // ═══ SYSTEM CONTROL GUARD ═══
    const config = await getSystemConfig();
    if (config.queue_paused) {
        await logSystemAction('GUARD_BLOCKED', { guard: 'queue_paused', route: '/api/jobs/pagegen' });
        return NextResponse.json({ success: true, message: 'System paused via control config.' });
    }

    const supabase = getServiceSupabase();
    
    try {
        const { data: queueJob } = await supabase.from('generation_queue')
            .select('*').in('status', ['pending', 'processing']).order('created_at', { ascending: true }).limit(1).single();

        if (!queueJob) return NextResponse.json({ success: true, message: 'No pending queue.' });

        const pagesToGenerate = queueJob.payload.pages || [];
        const limit = Math.min(config.batch_size || 5, 50); // Use config batch_size, cap at 50
        const batchList = pagesToGenerate.slice(queueJob.progress, queueJob.progress + limit);

        if (batchList.length === 0) {
            await supabase.from('generation_queue').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', queueJob.id);
            return NextResponse.json({ success: true });
        }

        let processedCount = 0;
        let skippedCount = 0;

        for (const pageReq of batchList) {
            const { slug, keyword_variation_id, keyword_text, page_type, content_level } = pageReq;
            
            // LOCATION FALLBACK LOGIC
            const city_id = pageReq.city_id || null;
            const locality_id = pageReq.locality_id || null;
            
            if (!pageReq.city_id) {
                console.warn(`[PageGen] WARNING: Missing city_id for slug ${slug}`);
            }

            // Skip if page already exists
            const { data: existingPage } = await supabase.from('page_index').select('id').eq('page_slug', slug).single();
            if (existingPage) { processedCount++; continue; }

            // --- ADVANCED PROMPT ENGINE ---
            const cityName = pageReq.city_name || slug.split('-').pop() || 'your city';
            const systemPrompt = getSystemPrompt();
            const userPrompt = buildPagePrompt({
                city: cityName,
                keyword: keyword_text,
                slug: slug,
                audience: "women aged 25-45 from middle-class families looking for financial independence"
            });

            // --- RESILIENT AI CALL (never throws) ---
            const responseText = await generateAiContent(systemPrompt, userPrompt);
            
            if (!responseText) {
                console.warn(`[PageGen] AI returned null for slug ${slug} — skipping`);
                skippedCount++;
                continue;
            }

            // --- PARSE AI JSON RESPONSE ---
            let aiContent;
            try {
                let clean = responseText.trim();
                // Strip markdown code fences if present
                if (clean.startsWith('```json')) clean = clean.substring(7);
                else if (clean.startsWith('```')) clean = clean.substring(3);
                if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
                clean = clean.trim();
                aiContent = JSON.parse(clean);
            } catch (e) {
                console.warn(`[PageGen] JSON parse failed for slug ${slug}:`, e.message);
                skippedCount++;
                continue;
            }

            // --- CONTENT QUALITY VALIDATION ---
            const mainContent = aiContent.local_opportunity_description || '';
            const realWordCount = mainContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;

            if (realWordCount < 200) {
                console.warn(`[PageGen] Content too short for ${slug}: ${realWordCount} words (min 200)`);
                skippedCount++;
                continue;
            }

            // --- DB INSERTS ---
            const contentStr = `${aiContent.hero_headline || ''} ${mainContent}`;
            const contentHash = crypto.createHash('sha256').update(contentStr).digest('hex');

            const { data: newPage, error: pageErr } = await supabase.from('page_index').insert({
                page_slug: slug, city_id, locality_id, keyword_variation_id, 
                status: 'pending_index', page_type: page_type || 'locality_page'
            }).select('id').single();

            if (pageErr) {
                console.error(`[PageGen] page_index insert failed for ${slug}:`, pageErr.message);
                skippedCount++;
                continue;
            }

            if (newPage) {
                // Content fingerprint (best effort)
                await supabase.from('content_fingerprints').insert({ 
                    page_index_id: newPage.id, content_hash: contentHash 
                }).catch(e => console.warn('[PageGen] fingerprint insert warning:', e.message));

                // Location content
                const { error: contentErr } = await supabase.from('location_content').insert({
                    page_index_id: newPage.id, 
                    content_level: content_level || 'locality_page', 
                    city_id, 
                    locality_id, 
                    keyword_variation: keyword_text,
                    hero_headline: aiContent.hero_headline || '',
                    local_opportunity_description: mainContent,
                    faq_data: aiContent.faq_data || [{question: 'How to apply?', answer: 'Fill the form above.'}],
                    cta_text: aiContent.cta_text || 'Apply Now', 
                    meta_title: aiContent.meta_title || '',
                    meta_description: aiContent.meta_description || '',
                    word_count: realWordCount
                });

                if (contentErr) {
                    console.error(`[PageGen] location_content insert failed for ${slug}:`, contentErr.message);
                } else {
                    console.log(`[PageGen] ✅ Generated page: ${slug} (${realWordCount} words)`);
                }
            }
            processedCount++;
        }

        const newProgress = queueJob.progress + processedCount;
        const isComplete = newProgress >= pagesToGenerate.length;
        await supabase.from('generation_queue').update({ 
            status: isComplete ? 'completed' : 'processing', 
            progress: newProgress,
            ...(isComplete ? { completed_at: new Date().toISOString() } : {})
        }).eq('id', queueJob.id);

        return NextResponse.json({ success: true, processed: processedCount, skipped: skippedCount });
    } catch (e) {
        console.error('[PageGen] Cron Error:', e);
        // Even on unexpected errors, return a structured response instead of crashing
        return NextResponse.json({ error: 'Internal Server Error', detail: e.message }, { status: 500 });
    }
}
