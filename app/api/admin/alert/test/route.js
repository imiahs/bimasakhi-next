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
import { sendTelegramAlert } from '@/lib/monitoring/alertSystem.js';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const dynamic = 'force-dynamic';

async function logObservability(supabase, level, message, userId) {
    try {
        await supabase.from('observability_logs').insert({
            level,
            message,
            user_id: userId,
            created_at: new Date().toISOString(),
        });
    } catch (e) {
        // Ignore logging errors
    }
}

export const POST = withAdminAuth(async (request) => {
    const supabase = getServiceSupabase();
    await logObservability(supabase, 'INFO', 'Alert test endpoint called', null);

    try {
        const body = await request.json().catch(() => ({}));
        const channel = body.channel || 'all';

        await logObservability(supabase, 'INFO', `Alert test channel: ${channel}`, null);

        const testRule = {
            id: 'manual_test',
            severity: 'info',
        };
        const testResult = {
            triggered: true,
            message: `✅ BimaSakhi alert test — channel "${channel}" is working. Sent by CEO at ${new Date().toISOString()}`,
            data: { test: true },
        };

        const results = {};

        // Telegram test
        if (channel === 'all' || channel === 'telegram') {
            await logObservability(supabase, 'INFO', `Checking telegram env: ${!!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)}`, null);
            if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
                try {
                    await logObservability(supabase, 'INFO', 'Sending telegram alert', null);
                    await sendTelegramAlert(testRule, testResult);
                    results.telegram = 'delivered';
                    await logObservability(supabase, 'INFO', 'Telegram alert delivered', null);
                } catch (e) {
                    results.telegram = `failed: ${e.message}`;
                    await logObservability(supabase, 'ERROR', `Telegram alert failed: ${e.message}`, null);
                }
            } else {
                results.telegram = 'not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)';
                await logObservability(supabase, 'WARN', 'Telegram not configured', null);
            }
        }

        // Slack test
        if (channel === 'all' || channel === 'slack') {
            if (process.env.ALERT_SLACK_WEBHOOK) {
                try {
                    const payload = {
                        text: `ℹ️ *BimaSakhi Alert Test*\n${testResult.message}`,
                    };
                    const res = await fetch(process.env.ALERT_SLACK_WEBHOOK, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    results.slack = res.ok ? 'delivered' : `failed: HTTP ${res.status}`;
                } catch (e) {
                    results.slack = `failed: ${e.message}`;
                }
            } else {
                results.slack = 'not configured (missing ALERT_SLACK_WEBHOOK)';
            }
        }

        // WhatsApp test
        if (channel === 'all' || channel === 'whatsapp') {
            if (process.env.ALERT_WHATSAPP_WEBHOOK && process.env.ALERT_WHATSAPP_TO) {
                try {
                    const res = await fetch(process.env.ALERT_WHATSAPP_WEBHOOK, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ to: process.env.ALERT_WHATSAPP_TO, message: testResult.message }),
                    });
                    results.whatsapp = res.ok ? 'delivered' : `failed: HTTP ${res.status}`;
                } catch (e) {
                    results.whatsapp = `failed: ${e.message}`;
                }
            } else {
                results.whatsapp = 'not configured (missing ALERT_WHATSAPP_WEBHOOK or ALERT_WHATSAPP_TO)';
            }
        }

        const anyDelivered = Object.values(results).some(r => r === 'delivered');

        await logObservability(supabase, 'INFO', `Alert test completed: ${JSON.stringify(results)}`, null);

        return NextResponse.json({
            success: true,
            message: anyDelivered
                ? 'At least one channel delivered the test alert successfully.'
                : 'No channels delivered — check env vars.',
            channel_tested: channel,
            results,
            env_status: {
                telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
                slack: !!process.env.ALERT_SLACK_WEBHOOK,
                whatsapp: !!(process.env.ALERT_WHATSAPP_WEBHOOK && process.env.ALERT_WHATSAPP_TO),
                email: !!(process.env.ALERT_EMAIL_WEBHOOK && process.env.ALERT_EMAIL_TO),
            },
        });

    } catch (err) {
        await logObservability(supabase, 'ERROR', `Alert test internal error: ${err.message}`, null);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
