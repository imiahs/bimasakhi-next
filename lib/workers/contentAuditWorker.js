import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/redis.js';
import { supabase } from '../supabase.js';
import { systemLogger } from '../logger/systemLogger.js';

function calculateSimilarity(hash1, hash2) {
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] === hash2[i]) matches++;
    }
    return Math.round((matches / hash1.length) * 100);
}

let workerInstance = null;

export const startContentAuditWorker = () => {
    if (workerInstance) return workerInstance;

    const connection = getRedisConnection();
    if (!connection) {
        console.warn("Redis unavailable for Content Audit.");
        return null;
    }

    workerInstance = new Worker('ContentAuditQueue', async job => {
        try {
            const { data: latestFingerprints } = await supabase.from('content_fingerprints').select('id, page_index_id, content_hash').order('created_at', { ascending: false }).limit(10);
            if (!latestFingerprints?.length) return { success: true };

            const { data: previousFingerprints } = await supabase.from('content_fingerprints').select('id, content_hash').order('created_at', { ascending: false }).range(10, 1000);

            let flaggedCount = 0;
            for (const fp of latestFingerprints) {
                let maxSimilarity = 0;
                if (previousFingerprints) {
                    for (const oldFp of previousFingerprints) {
                        const similarity = calculateSimilarity(fp.content_hash, oldFp.content_hash);
                        if (similarity > maxSimilarity) maxSimilarity = similarity;
                    }
                }
                if (maxSimilarity > 80) {
                    await supabase.from('page_index').update({ status: 'disabled' }).eq('id', fp.page_index_id);
                    await supabase.from('content_review_queue').insert({ page_index_id: fp.page_index_id, reason: `Similarity (${maxSimilarity}%)`, status: 'pending_review' });
                    await supabase.from('content_fingerprints').update({ similarity_score: maxSimilarity }).eq('id', fp.id);
                    flaggedCount++;
                }
            }

            systemLogger.logInfo('ContentAuditWorker', `Flagged Duplicates natively: ${flaggedCount}`);
            return { success: true, flagged: flaggedCount };
        } catch (error) {
            systemLogger.logError('ContentAuditWorker', `Job failed`, error.stack);
            throw error;
        }
    }, { connection });

    return workerInstance;
};
