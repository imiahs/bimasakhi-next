/**
 * /api/jobs/morning-brief — CEO Morning Brief Delivery
 * 
 * Bible Reference: Phase 21e, Section 38 (Layer 6), Section 41
 * Runs daily at 7:30 AM IST via QStash cron.
 * 
 * Generates a concise business summary and delivers via Telegram.
 * Includes: leads today, pages generated, system health, alerts, revenue signals.
 */
import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const maxDuration = 30;

async function handler() {
    try {
        const supabase = getServiceSupabase();
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        // Gather metrics from last 24 hours
        const [leadsResult, draftsResult, publishedResult, errorsResult, alertsResult, queueResult] = await Promise.all([
            // Leads captured
            supabase.from('crm_leads').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
            // Drafts generated
            supabase.from('content_drafts').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
            // Pages published
            supabase.from('page_index').select('*', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', yesterday),
            // Errors
            supabase.from('system_runtime_errors').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
            // Alerts fired
            supabase.from('system_alerts').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
            // Queue pending
            supabase.from('generation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);

        // Total pages count
        const { count: totalPages } = await supabase.from('page_index').select('*', { count: 'exact', head: true }).eq('status', 'published');

        // System health quick check
        const { count: recentJobFailures } = await supabase.from('job_runs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed')
            .gte('started_at', yesterday);

        const healthStatus = (errorsResult.count || 0) > 20 ? '🔴 DEGRADED' :
                            (errorsResult.count || 0) > 5 ? '🟡 WARNING' : '🟢 HEALTHY';

        // Format the brief
        const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
        
        const brief = [
            `🌅 *CEO Morning Brief*`,
            `📅 ${dateStr}`,
            ``,
            `*📊 Last 24 Hours:*`,
            `• Leads captured: ${leadsResult.count || 0}`,
            `• Content drafts created: ${draftsResult.count || 0}`,
            `• Pages published: ${publishedResult.count || 0}`,
            `• Queue pending: ${queueResult.count || 0}`,
            ``,
            `*🏗️ Total Published Pages:* ${totalPages || 0}`,
            ``,
            `*🛡️ System Health:* ${healthStatus}`,
            `• Errors (24h): ${errorsResult.count || 0}`,
            `• Alerts fired: ${alertsResult.count || 0}`,
            `• Job failures: ${recentJobFailures || 0}`,
            ``,
            `_Delivered automatically by BimaSakhi System_`,
        ].join('\n');

        // Deliver via Telegram
        let delivered = false;
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            try {
                const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: process.env.TELEGRAM_CHAT_ID,
                        text: brief,
                        parse_mode: 'Markdown',
                    }),
                });
                delivered = res.ok;
            } catch (e) {
                console.error('[MorningBrief] Telegram delivery failed:', e.message);
            }
        }

        // Log
        await supabase.from('observability_logs').insert({
            level: 'INFO',
            message: `CEO Morning Brief generated. Leads: ${leadsResult.count || 0}, Pages: ${publishedResult.count || 0}, Health: ${healthStatus}. Telegram: ${delivered ? 'delivered' : 'not delivered'}`,
            source: 'morning_brief',
            metadata: {
                leads: leadsResult.count || 0,
                drafts: draftsResult.count || 0,
                published: publishedResult.count || 0,
                errors: errorsResult.count || 0,
                health: healthStatus,
                telegram_delivered: delivered,
            },
        }).then(() => {}).catch(() => {});

        return NextResponse.json({
            success: true,
            brief_length: brief.length,
            telegram_delivered: delivered,
            metrics: {
                leads_24h: leadsResult.count || 0,
                drafts_24h: draftsResult.count || 0,
                published_24h: publishedResult.count || 0,
                total_pages: totalPages || 0,
                health: healthStatus,
            },
        });
    } catch (err) {
        console.error('[MorningBrief] Fatal error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export const POST = verifySignatureAppRouter(handler);
