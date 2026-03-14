import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const maxDuration = 300;

function calculateSimilarity(hash1, hash2) {
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] === hash2[i]) matches++;
    }
    return Math.round((matches / hash1.length) * 100);
}

export async function POST(request) {
    const startTime = Date.now();
    const upstashMessageId = request.headers.get('upstash-message-id') || `manual-${Date.now()}`;
    const upstashRetryCount = request.headers.get('upstash-retried') || '0';
    
    const supabase = getServiceSupabase();
    let successStatus = false;
    let flaggedCount = 0;
    let errorMessage = null;

    try {
        const { data: latestFingerprints } = await supabase
            .from('content_fingerprints')
            .select('id, page_index_id, content_hash')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (!latestFingerprints?.length) {
            successStatus = true;
            throw new Error('No recent content fingerprints found.');
        }

        const { data: previousFingerprints } = await supabase
            .from('content_fingerprints')
            .select('id, content_hash')
            .order('created_at', { ascending: false })
            .range(10, 1000);

        for (const fp of latestFingerprints) {
            let maxSimilarity = 0;
            if (previousFingerprints) {
                for (const oldFp of previousFingerprints) {
                    const similarity = calculateSimilarity(fp.content_hash, oldFp.content_hash);
                    if (similarity > maxSimilarity) maxSimilarity = similarity;
                }
            }
            if (maxSimilarity > 80) {
                // Batch updates
                await Promise.all([
                    supabase.from('page_index').update({ status: 'disabled' }).eq('id', fp.page_index_id),
                    supabase.from('content_review_queue').insert({ page_index_id: fp.page_index_id, reason: `Similarity (${maxSimilarity}%)`, status: 'pending_review' }),
                    supabase.from('content_fingerprints').update({ similarity_score: maxSimilarity }).eq('id', fp.id)
                ]);
                flaggedCount++;
            }
        }
        
        successStatus = true;
    } catch (e) {
        if (!successStatus) {
            errorMessage = e.message;
            console.error('[ContentAudit Worker]', e);
        }
    } finally {
        const executionTime = Date.now() - startTime;
        await supabase.from('worker_health').insert({
            worker_name: 'content-audit',
            status: successStatus ? 'healthy' : 'error',
            last_run: new Date().toISOString(),
            message: successStatus ? `Audit completed. Flagged duplicates: ${flaggedCount}` : errorMessage,
            metrics: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                retry_count: parseInt(upstashRetryCount),
                flagged_count: flaggedCount,
                success: successStatus
            }
        });
    }

    if (!successStatus) {
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, flagged: flaggedCount });
}
