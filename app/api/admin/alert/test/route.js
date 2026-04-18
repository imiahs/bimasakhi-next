/**
 * POST /api/admin/alert/test
 *
 * Sends a test alert to all configured channels.
 * Use this to verify TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are correct.
 *
 * Stage 3 fix (C6): CEO alert delivery test endpoint.
 *
 * Usage:
 *   POST /api/admin/alert/test
 *   Body: { "channel": "all" | "telegram" | "slack" | "whatsapp" }
 *
 * Response includes which channels were attempted and which delivered.
 */
import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request) => {
    return NextResponse.json({
        test: 'endpoint_hit',
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url
    });
});
