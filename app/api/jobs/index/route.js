import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const maxDuration = 300;

export async function POST(request) {
    const startTime = Date.now();
    const upstashMessageId = request.headers.get('upstash-message-id') || `manual-${Date.now()}`;
    const upstashRetryCount = request.headers.get('upstash-retried') || '0';
    
    let body = {};
    try { body = await request.json(); } catch { body = {}; }
    
    const supabase = getServiceSupabase();
    let successStatus = false;
    let promotedCount = 0;
    let demotedCount = 0;
    let errorMessage = null;

    try {
        const limit = body.batchSize || 200;
        const { data: pendingPages } = await supabase
            .from('page_index')
            .select('id')
            .eq('status', 'pending_index')
            .order('crawl_score', { ascending: false })
            .limit(limit);

        if (pendingPages?.length > 0) {
            const ids = pendingPages.map(p => p.id);
            // Throttle via single heavily aggregated set command natively mapped via `in` clause to prevent looping
            const { error } = await supabase.from('page_index').update({ status: 'active' }).in('id', ids);
            if (!error) promotedCount = ids.length;
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: weakPages } = await supabase
            .from('page_quality_scores')
            .select('page_index_id')
            .eq('traffic_score', 0)
            .lte('last_computed_at', thirtyDaysAgo)
            .limit(50);

        if (weakPages?.length > 0) {
            const weakIds = weakPages.map(p => p.page_index_id);
            const { error: demoteErr } = await supabase.from('page_index').update({ status: 'noindex' }).in('id', weakIds);
            if (!demoteErr) demotedCount = weakIds.length;
        }
        
        successStatus = true;
    } catch (e) {
        if (!successStatus) {
            errorMessage = e.message;
            console.error('[Index Worker]', e);
        }
    } finally {
        const executionTime = Date.now() - startTime;
        await supabase.from('worker_health').insert({
            worker_name: 'index-drone',
            status: successStatus ? 'healthy' : 'error',
            last_run: new Date().toISOString(),
            message: successStatus ? `Index managed safely. Promoted: ${promotedCount}. Demoted: ${demotedCount}.` : errorMessage,
            metrics: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                retry_count: parseInt(upstashRetryCount),
                promoted_count: promotedCount,
                demoted_count: demotedCount,
                success: successStatus
            }
        });
    }

    if (!successStatus) {
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, promoted: promotedCount, demoted: demotedCount });
}
