import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getDeliveryHealthMetrics, syncExternalDelivery, syncPendingExternalDeliveries } from '@/lib/queue/deliveryTruth';
import { performShosAction } from '@/lib/system/shos';

export const dynamic = 'force-dynamic';

function parseLimit(value, fallback = 50, max = 200) {
    const parsed = Number.parseInt(value || '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.min(parsed, max);
}

export const GET = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const operatorStatus = url.searchParams.get('operator_status');
        const eventStoreId = url.searchParams.get('event_id') || url.searchParams.get('event_store_id');
        const queueId = url.searchParams.get('queue_id') || url.searchParams.get('generation_queue_id');
        const messageId = url.searchParams.get('message_id');
        const shouldSync = url.searchParams.get('sync') === 'true';
        const limit = parseLimit(url.searchParams.get('limit'));

        let syncResult = null;
        if (shouldSync) {
            syncResult = messageId
                ? await syncExternalDelivery(messageId)
                : await syncPendingExternalDeliveries({ limit: Math.min(limit, 50), staleMinutes: 2 });
        }

        let query = supabase
            .from('external_delivery_logs')
            .select('*')
            .order('published_at', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }
        if (operatorStatus === 'active') {
            query = query.or('operator_status.is.null,operator_status.eq.active');
        } else if (operatorStatus) {
            query = query.eq('operator_status', operatorStatus);
        }
        if (eventStoreId) {
            query = query.eq('event_store_id', eventStoreId);
        }
        if (queueId) {
            query = query.eq('generation_queue_id', queueId);
        }
        if (messageId) {
            query = query.eq('provider_message_id', messageId);
        }

        const { data, error } = await query;
        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            filters: {
                status: status || null,
                operator_status: operatorStatus || null,
                event_store_id: eventStoreId || null,
                generation_queue_id: queueId || null,
                message_id: messageId || null,
                limit,
            },
            sync: syncResult,
            metrics: await getDeliveryHealthMetrics(),
            count: data?.length || 0,
            data: data || [],
        });
    } catch (error) {
        console.error('[Admin Delivery Logs] GET error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});

export const POST = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json().catch(() => ({}));
        const action = body.action || 'sync_pending';

        if (action === 'sync_message') {
            if (!body.message_id) {
                return NextResponse.json({ success: false, error: 'message_id_required' }, { status: 400 });
            }

            const result = await syncExternalDelivery(body.message_id);
            return NextResponse.json({ success: !!result?.success, action, result }, { status: result?.success ? 200 : 500 });
        }

        if (action === 'sync_pending') {
            const result = await syncPendingExternalDeliveries({
                limit: parseLimit(String(body.limit || ''), 25, 100),
                staleMinutes: parseLimit(String(body.stale_minutes || ''), 2, 60),
            });
            return NextResponse.json({ success: !!result?.success, action, result }, { status: result?.success ? 200 : 500 });
        }

        if (action === 'retry_delivery') {
            if (!body.id) {
                return NextResponse.json({ success: false, error: 'id_required' }, { status: 400 });
            }

            const result = await performShosAction({ action: 'delivery_retry', id: body.id, reason: body.reason || null }, user);
            return NextResponse.json(result, { status: result.success === false ? 400 : 200 });
        }

        if (action === 'retry_all') {
            const result = await performShosAction({ action: 'delivery_retry_all', reason: body.reason || null }, user);
            return NextResponse.json(result, { status: result.success === false ? 400 : 200 });
        }

        if (action === 'mark_terminal') {
            if (!body.id) {
                return NextResponse.json({ success: false, error: 'id_required' }, { status: 400 });
            }

            const result = await performShosAction({ action: 'delivery_mark_terminal', id: body.id, reason: body.reason || null }, user);
            return NextResponse.json(result, { status: result.success === false ? 400 : 200 });
        }

        return NextResponse.json({ success: false, error: `unknown_action:${action}` }, { status: 400 });
    } catch (error) {
        console.error('[Admin Delivery Logs] POST error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});