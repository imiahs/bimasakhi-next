/**
 * GET /api/admin/dlq — List dead letter queue entries
 * POST /api/admin/dlq — Reprocess or discard a DLQ entry
 * 
 * Bible Reference: Section 39, Rule 21
 * Super admin only.
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { performShosAction } from '@/lib/system/shos';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
        const status = searchParams.get('status') || 'pending';
        const offset = (page - 1) * limit;

        let query = supabase
            .from('job_dead_letters')
            .select('*', { count: 'exact' })
            .order('failed_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false });

        if (status === 'pending') {
            query = query.or('operator_status.is.null,operator_status.eq.pending');
        } else if (status !== 'all') {
            query = query.eq('operator_status', status);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            total: count || 0,
            page,
            pages: Math.ceil((count || 0) / limit),
            status,
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);

export const POST = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const { id, action } = body;
        const actionMap = {
            reprocess: 'dlq_retry',
            discard: 'dlq_discard',
            resolve: 'dlq_resolve',
            requeue: 'dlq_requeue',
            retry_all: 'dlq_retry_all',
            clear_all: 'dlq_clear_all',
        };

        if (!action || !actionMap[action]) {
            return NextResponse.json({ success: false, error: 'action must be reprocess, discard, resolve, requeue, retry_all, or clear_all' }, { status: 400 });
        }

        if (!id && ['reprocess', 'discard', 'resolve', 'requeue'].includes(action)) {
            return NextResponse.json({ success: false, error: 'id required for single-entry DLQ actions' }, { status: 400 });
        }

        const result = await performShosAction({
            action: actionMap[action],
            id: id || null,
            reason: body.reason || null,
        }, user);

        return NextResponse.json(result, { status: result.success === false ? 400 : 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
