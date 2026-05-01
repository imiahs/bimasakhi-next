import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getDeliveryHealthMetrics, syncExternalDelivery, syncPendingExternalDeliveries } from '@/lib/queue/deliveryTruth';

export const maxDuration = 60;

async function handler(request) {
    const body = await request.json().catch(() => ({}));
    const messageId = body.message_id || null;
    const limit = Math.min(Math.max(Number.parseInt(String(body.limit || '25'), 10) || 25, 1), 100);
    const staleMinutes = Math.min(Math.max(Number.parseInt(String(body.stale_minutes || '2'), 10) || 2, 1), 60);

    const result = messageId
        ? await syncExternalDelivery(messageId)
        : await syncPendingExternalDeliveries({ limit, staleMinutes });

    return NextResponse.json({
        success: !!result?.success,
        result,
        metrics: await getDeliveryHealthMetrics(),
        timestamp: new Date().toISOString(),
    }, { status: result?.success ? 200 : 500 });
}

export const POST = verifySignatureAppRouter(handler);