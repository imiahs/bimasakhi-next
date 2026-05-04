import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { enqueuePageGeneration } from '@/lib/queue/publisher';
import { safeLog } from '@/lib/safeLogger.js';
import { isValidUUID } from '@/lib/observability';

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

/**
 * PATCH /api/admin/queue
 * Operational actions on failed/stuck generation queue rows.
 * 
 * { action: 'retry_failed' }              — Reset all failed rows to pending
 * { action: 'retry_failed', id: '<uuid>' } — Reset one specific failed row to pending
 * { action: 'clear_failed' }              — Delete all failed/dead-letter rows
 */
export const PATCH = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const body = await request.json();
        const { action, id } = body;
        const adminId = request.headers.get('x-admin-user') || request.headers.get('x-admin-id') || 'unknown';

        if (action === 'retry_failed') {
            // Validate specific id if provided
            if (id && !isValidUUID(id)) {
                return NextResponse.json({ success: false, error: 'Invalid queue row id' }, { status: 400 });
            }

            let query = supabase
                .from('generation_queue')
                .update({
                    status: 'pending',
                    retry_count: 0,
                    error_message: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('status', 'failed');

            if (id) query = query.eq('id', id);

            const { error, count } = await query;

            if (error) {
                return NextResponse.json({ success: false, error: error.message }, { status: 500 });
            }

            await safeLog('ADMIN_QUEUE_RETRY_FAILED', 'Admin reset failed queue rows to pending', {
                id: id || 'all',
                reset_count: count,
                admin_id: adminId,
            });

            return NextResponse.json({ success: true, action: 'retry_failed', reset: count || 0, id: id || 'all' });
        }

        if (action === 'clear_failed') {
            const { error, count } = await supabase
                .from('generation_queue')
                .delete()
                .eq('status', 'failed');

            if (error) {
                return NextResponse.json({ success: false, error: error.message }, { status: 500 });
            }

            await safeLog('ADMIN_QUEUE_CLEAR_FAILED', 'Admin deleted all failed queue rows', {
                deleted_count: count,
                admin_id: adminId,
            });

            return NextResponse.json({ success: true, action: 'clear_failed', deleted: count || 0 });
        }

        return NextResponse.json(
            { success: false, error: `Unknown action: ${action}. Valid: retry_failed, clear_failed` },
            { status: 400 }
        );
    } catch (error) {
        console.error('Queue API PATCH error:', error);
        return NextResponse.json({ success: false, error: 'Failed to process queue action' }, { status: 500 });
    }
}, ['super_admin']);
