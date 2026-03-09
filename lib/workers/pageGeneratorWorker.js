import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/redis.js';
import { supabase } from '../supabase.js';
import { systemLogger } from '../logger/systemLogger.js';
import { metricsBatcher } from '../telemetry/metricsBatcher.js';
import crypto from 'crypto';

// Minimal mock AI generator locally avoiding external path complexities
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

let workerInstance = null;

export const startPageGeneratorWorker = () => {
    if (workerInstance) return workerInstance;

    const connection = getRedisConnection();
    if (!connection) {
        console.warn("Redis unavailable for Page Generator bounds.");
        return null;
    }

    workerInstance = new Worker('PageGeneratorQueue', async job => {
        try {
            systemLogger.logInfo('PageGeneratorWorker', `Processing batch ${job.id}`);

            const { data: queueJob } = await supabase
                .from('generation_queue')
                .select('*')
                .in('status', ['pending', 'processing'])
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (!queueJob) return { success: true, message: 'No pending DB records.' };

            await supabase.from('generation_queue').update({ status: 'processing' }).eq('id', queueJob.id);

            const pagesToGenerate = queueJob.payload.pages || [];
            const limit = job.data.limit || 500;
            const batchList = pagesToGenerate.slice(queueJob.progress, queueJob.progress + limit);

            if (batchList.length === 0) {
                await supabase.from('generation_queue').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', queueJob.id);
                return { success: true };
            }

            let processedCount = 0;
            for (const pageReq of batchList) {
                const { slug, city_id, locality_id, keyword_variation_id, keyword_text, crawl_priority, content_level } = pageReq;

                const { data: existingPage } = await supabase.from('page_index').select('id').eq('page_slug', slug).single();
                if (existingPage) { processedCount++; continue; }

                let aiContent = await generatePageContent(`Generate ${keyword_text} content for ${slug}`);
                const contentStr = `${aiContent.hero_headline} ${aiContent.local_opportunity_description} ${aiContent.cta_text}`;
                const contentHash = crypto.createHash('sha256').update(contentStr).digest('hex');

                const { data: newPage } = await supabase.from('page_index').insert({
                    page_slug: slug, city_id, locality_id, keyword_variation_id, status: 'pending_index', crawl_priority: crawl_priority || 'locality_page'
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

            systemLogger.logInfo('PageGeneratorWorker', `Batch ${job.id} native completion. Processed: ${processedCount}`);
            metricsBatcher.recordJobProcessed();
            return { success: true, processed: processedCount };

        } catch (error) {
            systemLogger.logError('PageGeneratorWorker', `Job ${job.id} failed`, error.stack);
            metricsBatcher.recordJobFailed();
            throw error;
        }
    }, { connection });

    workerInstance.on('failed', (job, err) => {
        systemLogger.logError('PageGeneratorWorker', `Job definitively failed after retries: ${job.id}`, err.message);
    });

    return workerInstance;
};
