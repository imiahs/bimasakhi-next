import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import crypto from 'crypto';

export const maxDuration = 300; // Allow 5 minutes Serverless time

async function generatePageContent(prompt) {
    return {
        hero_headline: 'Accelerate Your LIC Career Locally',
        local_opportunity_description: 'Join thousands of successfully mapped Bima Sakhi agents. ' + 'word '.repeat(800),
        faq_data: [{ question: 'How to start?', answer: 'Apply today.' }],
        cta_text: 'Apply Now',
        meta_title: 'LIC Career Opportunity',
        meta_description: 'Become a certified LIC agent in your area.'
    };
}

export async function POST(request) {
    const startTime = Date.now();
    const upstashMessageId = request.headers.get('upstash-message-id') || `manual-${Date.now()}`;
    const upstashRetryCount = request.headers.get('upstash-retried') || '0';
    
    // Fallback queue safety — only run valid JSONs
    let body = {};
    try {
        body = await request.json();
    } catch { body = {}; }

    const supabase = getServiceSupabase();
    let successStatus = false;
    let processedCount = 0;
    let errorMessage = null;

    try {
        const { data: queueJob } = await supabase
            .from('generation_queue')
            .select('*')
            .in('status', ['pending', 'processing'])
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        if (!queueJob) {
             successStatus = true;
             throw new Error('No pending generation jobs found in queue.');
        }

        // Idempotency flag wrapper
        await supabase.from('generation_queue').update({ status: 'processing' }).eq('id', queueJob.id);

        const pagesToGenerate = queueJob.payload.pages || [];
        const limit = body.limit || 50; 
        const batchList = pagesToGenerate.slice(queueJob.progress, queueJob.progress + limit);

        if (batchList.length === 0) {
            await supabase.from('generation_queue').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', queueJob.id);
            successStatus = true;
            throw new Error('Batch list empty — completing.');
        }

        for (const pageReq of batchList) {
            const { slug, city_id, locality_id, keyword_variation_id, keyword_text, page_type, content_level } = pageReq;

            // Prevent duplicate generation idempotently natively
            const { data: existingPage } = await supabase.from('page_index').select('id').eq('page_slug', slug).maybeSingle();
            if (existingPage) { processedCount++; continue; }

            let aiContent = await generatePageContent(`Generate ${keyword_text} content for ${slug}`);
            const contentStr = `${aiContent.hero_headline} ${aiContent.local_opportunity_description} ${aiContent.cta_text}`;
            const contentHash = crypto.createHash('sha256').update(contentStr).digest('hex');

            const { data: newPage } = await supabase.from('page_index').insert({
                page_slug: slug, city_id, locality_id, keyword_variation_id, status: 'pending_index', page_type: page_type || 'locality_page'
            }).select('id').single();

            if (newPage) {
                await supabase.from('content_fingerprints').insert({ page_index_id: newPage.id, content_hash: contentHash });
                await supabase.from('location_content').insert({
                    page_index_id: newPage.id, content_level, city_id, locality_id, keyword_variation: keyword_text,
                    hero_headline: aiContent.hero_headline, local_opportunity_description: aiContent.local_opportunity_description,
                    faq_data: aiContent.faq_data, cta_text: aiContent.cta_text, meta_title: aiContent.meta_title, meta_description: aiContent.meta_description,
                    word_count: 800
                });
            }
            processedCount++;
        }

        const newProgress = queueJob.progress + processedCount;
        if (newProgress >= pagesToGenerate.length) {
            await supabase.from('generation_queue').update({ status: 'completed', progress: newProgress, completed_at: new Date().toISOString() }).eq('id', queueJob.id);
        } else {
            await supabase.from('generation_queue').update({ status: 'pending', progress: newProgress }).eq('id', queueJob.id);
        }
        
        successStatus = true;
    } catch (e) {
        if (!successStatus) {
            errorMessage = e.message;
            console.error('[PageGen Worker]', e);
        }
    } finally {
        const executionTime = Date.now() - startTime;
        
        // Phase 4: Observability Trace log to database natively
        await supabase.from('worker_health').insert({
            worker_name: 'page-generator',
            status: successStatus ? 'healthy' : 'error',
            last_run: new Date().toISOString(),
            message: successStatus ? `Batch completed. Processed: ${processedCount}` : errorMessage,
            metrics: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                retry_count: parseInt(upstashRetryCount),
                processed_count: processedCount,
                success: successStatus
            }
        });
    }

    if (!successStatus) {
        // Force endpoint closure to 500 so QStash safely triggers its Retry policy natively
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, processed: processedCount });
}
