import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { generateAiContent } from '@/lib/ai/generateContent';
import crypto from 'crypto';

export const maxDuration = 60; // Max time on Vercel
export const dynamic = 'force-dynamic';

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    
    try {
        const { data: queueJob } = await supabase.from('generation_queue')
            .select('*').in('status', ['pending', 'processing']).order('created_at', { ascending: true }).limit(1).single();

        if (!queueJob) return NextResponse.json({ success: true, message: 'No pending queue.' });

        const pagesToGenerate = queueJob.payload.pages || [];
        const limit = 20; // Serverless cap
        const batchList = pagesToGenerate.slice(queueJob.progress, queueJob.progress + limit);

        if (batchList.length === 0) {
            await supabase.from('generation_queue').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', queueJob.id);
            return NextResponse.json({ success: true });
        }

        let processedCount = 0;
        for (const pageReq of batchList) {
            const { slug, city_id, locality_id, keyword_variation_id, keyword_text, page_type, content_level } = pageReq;
            const { data: existingPage } = await supabase.from('page_index').select('id').eq('page_slug', slug).single();
            if (existingPage) { processedCount++; continue; }

            const prompt = `Act as an expert LIC Recruiter. Write a 600-word localized high-converting landing page for keyword "${keyword_text}" targeting "${slug}". Focus on the benefits for women achieving financial independence through LIC. Format as valid JSON exact match: { "hero_headline": "string", "local_opportunity_description": "string", "meta_title": "string", "meta_description": "string", "cta_text": "string" }`;

            const responseText = await generateAiContent("You are an SEO expert. Output ONLY JSON.", prompt);
            
            let aiContent;
            try {
                let clean = responseText.trim();
                if (clean.startsWith('```json')) clean = clean.substring(7, clean.length - 3).trim();
                else if (clean.startsWith('```')) clean = clean.substring(3, clean.length - 3).trim();
                aiContent = JSON.parse(clean);
            } catch (e) {
                console.warn('AI Parsing failed, skipping.', e);
                continue;
            }

            if (!aiContent.local_opportunity_description || aiContent.local_opportunity_description.length < 500) {
                console.warn('Content failed minimum validation.');
                continue;
            }

            const contentStr = `${aiContent.hero_headline} ${aiContent.local_opportunity_description}`;
            const contentHash = crypto.createHash('sha256').update(contentStr).digest('hex');

            const { data: newPage } = await supabase.from('page_index').insert({
                page_slug: slug, city_id, locality_id, keyword_variation_id, status: 'pending_index', page_type: page_type || 'locality_page'
            }).select('id').single();

            if (newPage) {
                await supabase.from('content_fingerprints').insert({ page_index_id: newPage.id, content_hash: contentHash });
                await supabase.from('location_content').insert({
                    page_index_id: newPage.id, content_level, city_id, locality_id, keyword_variation: keyword_text,
                    hero_headline: aiContent.hero_headline, local_opportunity_description: aiContent.local_opportunity_description,
                    faq_data: [{question: 'How to apply?', answer: 'Fill the form above.'}], cta_text: aiContent.cta_text || 'Apply Now', 
                    meta_title: aiContent.meta_title, meta_description: aiContent.meta_description,
                    word_count: 800
                });
            }
            processedCount++;
        }

        const newProgress = queueJob.progress + processedCount;
        await supabase.from('generation_queue').update({ status: newProgress >= pagesToGenerate.length ? 'completed' : 'processing', progress: newProgress }).eq('id', queueJob.id);

        return NextResponse.json({ success: true, processed: processedCount });
    } catch (e) {
        console.error('PageGen Cron Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
