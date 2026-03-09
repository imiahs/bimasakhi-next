import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/redis.js';
import { supabase } from '../supabase.js';
import { systemLogger } from '../logger/systemLogger.js';

let workerInstance = null;

export const startCacheWorker = () => {
    if (workerInstance) return workerInstance;

    const connection = getRedisConnection();
    if (!connection) return null;

    workerInstance = new Worker('CacheQueue', async job => {
        try {
            const { data: popularPages } = await supabase.from('page_index').select('page_slug').eq('status', 'active').limit(50);
            let count = 0;
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

            if (popularPages) {
                for (const page of popularPages) {
                    const res = await fetch(`${siteUrl}/${page.page_slug}`);
                    if (!res.ok) continue;
                    const html = await res.text();
                    const authLessHtml = html.replace('data-auth="true"', 'data-auth="false"');

                    await supabase.from('page_cache').upsert({
                        page_slug: page.page_slug,
                        cached_html: authLessHtml,
                        expires_at: new Date(Date.now() + 86400000).toISOString()
                    }, { onConflict: 'page_slug' });
                    count++;
                }
            }
            systemLogger.logInfo('CacheWorker', `Static Edge HTML caching executed natively. Pages cached: ${count}`);
            return { success: true, preRendered: count };
        } catch (error) {
            systemLogger.logError('CacheWorker', `Render failure`, error.message);
            throw error;
        }
    }, { connection });

    return workerInstance;
};
