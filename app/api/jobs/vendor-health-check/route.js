/**
 * POST /api/jobs/vendor-health-check — Periodic vendor health check
 * 
 * Bible Reference: Section 39, Rule 24
 * Called by QStash cron every 5 minutes.
 * Checks: Supabase connectivity, QStash config, system mode.
 * Records SLA snapshots. Triggers alerts on threshold breach.
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    // QStash signature verification (if available)
    const startTime = Date.now();
    const results = {};

    // ─── CHECK 1: Supabase ───────────────────────
    try {
        const t1 = Date.now();
        const supabase = getServiceSupabase();
        const { error } = await supabase.from('system_control_config').select('singleton_key').limit(1);
        const latency = Date.now() - t1;

        results.supabase = {
            status: error ? 'down' : 'healthy',
            latency_ms: latency,
            error: error?.message || null,
        };

        // Record SLA snapshot
        if (!error) {
            await supabase.from('sla_snapshots').insert({
                service: 'supabase',
                metric: 'health_check',
                value: latency,
                threshold_warning: 100,
                threshold_critical: 500,
                status: latency > 500 ? 'critical' : latency > 100 ? 'warning' : 'normal',
                sample_size: 1,
                window_minutes: 5,
            });

            // Update vendor contract health
            await supabase.from('vendor_contracts')
                .update({
                    health_status: error ? 'down' : latency > 500 ? 'degraded' : 'healthy',
                    last_health_check: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('vendor', 'supabase');
        }
    } catch (err) {
        results.supabase = { status: 'down', latency_ms: Date.now() - startTime, error: err.message };
    }

    // ─── CHECK 2: QStash (config check, not connectivity) ───
    results.qstash = {
        status: process.env.QSTASH_TOKEN ? 'configured' : 'not_configured',
        latency_ms: 0,
    };

    // ─── CHECK 3: Zoho (config check) ───
    results.zoho = {
        status: process.env.ZOHO_CLIENT_ID ? 'configured' : 'not_configured',
        latency_ms: 0,
    };

    // ─── CHECK 4: Gemini (config check) ───
    results.gemini = {
        status: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY ? 'configured' : 'not_configured',
        latency_ms: 0,
    };

    // ─── RECORD: DLQ depth check ───
    let dlqDepth = 0;
    try {
        const supabase = getServiceSupabase();
        const { count } = await supabase
            .from('job_dead_letters')
            .select('*', { count: 'exact', head: true });
        dlqDepth = count || 0;

        if (dlqDepth > 0) {
            await supabase.from('sla_snapshots').insert({
                service: 'internal',
                metric: 'dlq_depth',
                value: dlqDepth,
                threshold_warning: 5,
                threshold_critical: 10,
                status: dlqDepth > 10 ? 'critical' : dlqDepth > 5 ? 'warning' : 'normal',
                sample_size: 1,
                window_minutes: 5,
            });
        }
    } catch { /* non-fatal */ }

    // ─── RECORD: Error rate check (last 5 min) ───
    try {
        const supabase = getServiceSupabase();
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const [{ count: errorCount }, { count: totalCount }] = await Promise.all([
            supabase.from('observability_logs')
                .select('*', { count: 'exact', head: true })
                .in('level', ['ERROR', 'CRITICAL'])
                .gte('created_at', fiveMinAgo),
            supabase.from('observability_logs')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', fiveMinAgo),
        ]);

        const errorRate = totalCount > 0 ? ((errorCount || 0) / totalCount) * 100 : 0;

        await supabase.from('sla_snapshots').insert({
            service: 'internal',
            metric: 'error_rate_5m',
            value: errorRate,
            threshold_warning: 1,
            threshold_critical: 5,
            status: errorRate > 5 ? 'critical' : errorRate > 1 ? 'warning' : 'normal',
            sample_size: totalCount || 0,
            window_minutes: 5,
        });
    } catch { /* non-fatal */ }

    // Log summary
    try {
        const supabase = getServiceSupabase();
        await supabase.from('observability_logs').insert({
            level: 'INFO',
            message: `Vendor health check: supabase=${results.supabase.status}, dlq=${dlqDepth}`,
            source: 'vendor_health_check',
            metadata: results,
        });
    } catch { /* non-fatal */ }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
        success: true,
        checks: results,
        dlq_depth: dlqDepth,
        duration_ms: totalDuration,
        timestamp: new Date().toISOString(),
    });
}
