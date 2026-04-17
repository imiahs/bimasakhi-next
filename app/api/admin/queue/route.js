import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { enqueuePageGeneration } from '@/lib/queue/publisher';
import { safeLog } from '@/lib/safeLogger.js';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('generation_queue')
            .select('status');

        if (error) {
            throw error;
        }

        const summary = {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            paused: 0
        };

        (data || []).forEach((row) => {
            if (summary[row.status] !== undefined) {
                summary[row.status] += 1;
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                ...summary,
                total: Object.values(summary).reduce((sum, value) => sum + value, 0)
            }
        });
    } catch (error) {
        console.error('Queue API GET error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch generation queue'
        }, { status: 500 });
    }
});

export const POST = withAdminAuth(async (request) => {
    try {
        if (!process.env.QSTASH_TOKEN) {
            return NextResponse.json({
                success: false,
                error: 'QStash token is not configured for manual worker dispatch'
            }, { status: 500 });
        }

        const supabase = getServiceSupabase();

        // Find the next pending queue job to dispatch
        const { data: pendingJob, error: fetchErr } = await supabase
            .from('generation_queue')
            .select('id')
            .eq('status', 'pending')
            .eq('task_type', 'pagegen')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (fetchErr) {
            console.error('Queue fetch error:', fetchErr);
            return NextResponse.json({
                success: false,
                error: 'Failed to query generation queue'
            }, { status: 500 });
        }

        if (!pendingJob) {
            return NextResponse.json({
                success: false,
                error: 'No pending pagegen jobs in queue'
            }, { status: 404 });
        }

        const triggeredBy = request.headers.get('x-admin-user') || 'unknown';
        console.log('[ADMIN QUEUE] Dispatching pending job:', { queueId: pendingJob.id, triggeredBy });

        const dispatch = await enqueuePageGeneration({ queueId: pendingJob.id });

        await safeLog('ADMIN_QUEUE_DISPATCH', 'Manual pagegen dispatch', {
            queueId: pendingJob.id,
            triggeredBy,
            messageId: dispatch?.messageId
        });

        if (!dispatch?.messageId) {
            return NextResponse.json({
                success: false,
                error: 'Queue trigger failed'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: { ...dispatch, queueId: pendingJob.id }
        });
    } catch (error) {
        console.error('Queue API POST error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to trigger generation worker'
        }, { status: 500 });
    }
});
