import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { enqueuePageGeneration } from '@/lib/queue/publisher';
import { safeLog } from '@/lib/safeLogger.js';
import { isValidUUID } from '@/lib/observability';
import { performShosAction } from '@/lib/system/shos';

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
            paused: 0,
            cancelled: 0,
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

export const POST = withAdminAuth(async (request, user) => {
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

        const triggeredBy = user?.email || user?.id || 'unknown';
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

/**
 * PATCH /api/admin/queue
 * Operational actions on failed/stuck generation queue rows.
 * 
 * { action: 'retry_failed' }              — Reset all failed rows to pending
 * { action: 'retry_failed', id: '<uuid>' } — Reset one specific failed row to pending
 * { action: 'clear_failed' }              — Clear failed rows without deleting history
 * { action: 'cancel_failed', id }         — Mark one failed row cancelled
 */
export const PATCH = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const { action, id } = body;
        const adminId = user?.email || user?.id || request.headers.get('x-admin-user') || 'unknown';
        const actionMap = {
            retry_failed: 'queue_retry_failed',
            clear_failed: 'queue_clear_failed',
            cancel_failed: 'queue_cancel_failed',
        };

        if (!actionMap[action]) {
            return NextResponse.json(
                { success: false, error: `Unknown action: ${action}. Valid: retry_failed, clear_failed, cancel_failed` },
                { status: 400 }
            );
        }

        if (id && !isValidUUID(id)) {
            return NextResponse.json({ success: false, error: 'Invalid queue row id' }, { status: 400 });
        }

        const result = await performShosAction({
            action: actionMap[action],
            id: id || null,
            reason: body.reason || null,
        }, user);

        await safeLog(`ADMIN_QUEUE_${action.toUpperCase()}`, 'Admin operated queue rows through SHOS', {
            id: id || 'all',
            action,
            admin_id: adminId,
        });

        return NextResponse.json(result, { status: result.success === false ? 400 : 200 });
    } catch (error) {
        console.error('Queue API PATCH error:', error);
        return NextResponse.json({ success: false, error: 'Failed to process queue action' }, { status: 500 });
    }
}, ['super_admin']);
