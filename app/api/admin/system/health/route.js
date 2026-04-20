/**
 * /api/admin/system/health — Central System Health View
 * 
 * Bible Reference: Rule 24 (SLA Monitoring), Stabilization Phase
 * 
 * Provides a single endpoint for CEO to see:
 *   - Cron job status (last run times, health)
 *   - Alert counts (active, by severity)
 *   - System failures (recent errors, DLQ depth)
 *   - Escalation state (unacknowledged alerts)
 *   - System mode (normal, degraded, safe, maintenance)
 *   - Key metrics (leads, pages, queue)
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
    const supabase = getServiceSupabase();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    try {
        // Run all queries in parallel for speed
        const [
            // Cron status: last run of each cron job
            alertScanLast,
            reconciliationLast,
            morningBriefLast,
            eventRetryLast,
            vendorHealthLast,
            // Active alerts by severity
            activeAlerts,
            // Unacknowledged escalations
            unackedEscalations,
            // Errors in last hour
            recentErrors,
            // Errors in last 24h
            dailyErrors,
            // DLQ depth
            dlqCount,
            // System mode
            systemMode,
            // Leads today
            leadsToday,
            // Queue pending
            queuePending,
            // Published pages total
            totalPages,
        ] = await Promise.all([
            // Cron: last alert-scan
            supabase.from('observability_logs')
                .select('created_at, message')
                .in('level', ['ALERT_SCAN_CLEAN', 'ALERT_SCAN_FIRED'])
                .order('created_at', { ascending: false })
                .limit(1)
                .then(r => r.data?.[0] || null),
            // Cron: last reconciliation
            supabase.from('observability_logs')
                .select('created_at, message')
                .in('level', ['RECONCILIATION_CLEAN', 'RECONCILIATION_ISSUES_FOUND'])
                .order('created_at', { ascending: false })
                .limit(1)
                .then(r => r.data?.[0] || null),
            // Cron: last morning brief
            supabase.from('observability_logs')
                .select('created_at, message')
                .eq('source', 'morning_brief')
                .order('created_at', { ascending: false })
                .limit(1)
                .then(r => r.data?.[0] || null),
            // Cron: last event-retry
            supabase.from('observability_logs')
                .select('created_at, message')
                .eq('level', 'RETRY_DAEMON_RUN')
                .order('created_at', { ascending: false })
                .limit(1)
                .then(r => r.data?.[0] || null),
            // Cron: last vendor health check
            supabase.from('observability_logs')
                .select('created_at, message')
                .eq('source', 'vendor_health_check')
                .order('created_at', { ascending: false })
                .limit(1)
                .then(r => r.data?.[0] || null),
            // Active (unresolved) alerts grouped by severity
            supabase.from('system_alerts')
                .select('severity')
                .eq('resolved', false)
                .then(r => {
                    const alerts = r.data || [];
                    return {
                        total: alerts.length,
                        critical: alerts.filter(a => a.severity === 'critical').length,
                        high: alerts.filter(a => a.severity === 'high').length,
                        medium: alerts.filter(a => a.severity === 'medium').length,
                        low: alerts.filter(a => a.severity === 'low').length,
                    };
                }),
            // Unacknowledged P0/P1 escalations
            supabase.from('alert_deliveries')
                .select('id, severity, message, retry_count, created_at, next_escalation_at')
                .eq('acknowledged', false)
                .in('severity', ['P0', 'P1'])
                .order('created_at', { ascending: false })
                .limit(10)
                .then(r => r.data || []),
            // Errors in last hour
            supabase.from('system_runtime_errors')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', oneHourAgo)
                .then(r => r.count || 0),
            // Errors in last 24h
            supabase.from('system_runtime_errors')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', twentyFourHoursAgo)
                .then(r => r.count || 0),
            // DLQ depth
            supabase.from('job_dead_letters')
                .select('*', { count: 'exact', head: true })
                .then(r => r.count || 0),
            // System mode from config
            supabase.from('system_control_config')
                .select('system_mode, safe_mode, ai_enabled, followup_enabled')
                .eq('singleton_key', true)
                .single()
                .then(r => r.data || { system_mode: 'normal', safe_mode: false }),
            // Leads today
            supabase.from('crm_leads')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', twentyFourHoursAgo)
                .then(r => r.count || 0),
            // Queue pending
            supabase.from('generation_queue')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .then(r => r.count || 0),
            // Total published pages
            supabase.from('page_index')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published')
                .then(r => r.count || 0),
        ]);

        // Determine cron health
        const cronAge = (lastRun) => {
            if (!lastRun?.created_at) return { status: 'unknown', last_run: null, age_minutes: null };
            const age = Math.round((now.getTime() - new Date(lastRun.created_at).getTime()) / 60000);
            return {
                status: age <= 10 ? 'healthy' : age <= 30 ? 'stale' : 'dead',
                last_run: lastRun.created_at,
                age_minutes: age,
            };
        };

        const crons = {
            'alert-scan': { ...cronAge(alertScanLast), expected_interval: '5m' },
            'reconciliation': { ...cronAge(reconciliationLast), expected_interval: '5m' },
            'event-retry': { ...cronAge(eventRetryLast), expected_interval: '5m' },
            'vendor-health-check': { ...cronAge(vendorHealthLast), expected_interval: '5m' },
            'morning-brief': { ...cronAge(morningBriefLast), expected_interval: '24h' },
        };

        // Overall health determination
        const hasActiveCritical = activeAlerts.critical > 0;
        const hasUnackedEscalations = unackedEscalations.length > 0;
        const highErrorRate = recentErrors > 20;
        const hasDLQ = dlqCount > 0;
        const cronsDead = Object.values(crons).some(c => c.status === 'dead');

        let overallHealth = 'HEALTHY';
        if (hasActiveCritical || hasUnackedEscalations || highErrorRate) {
            overallHealth = 'DEGRADED';
        }
        if (systemMode?.safe_mode) {
            overallHealth = 'SAFE_MODE';
        }

        return NextResponse.json({
            success: true,
            timestamp: now.toISOString(),
            overall_health: overallHealth,
            system_mode: {
                mode: systemMode?.system_mode || 'normal',
                safe_mode: systemMode?.safe_mode || false,
                ai_enabled: systemMode?.ai_enabled ?? true,
                followup_enabled: systemMode?.followup_enabled ?? true,
            },
            crons,
            alerts: {
                active: activeAlerts,
                unacknowledged_escalations: unackedEscalations,
            },
            failures: {
                errors_1h: recentErrors,
                errors_24h: dailyErrors,
                dlq_depth: dlqCount,
                has_issues: hasDLQ || highErrorRate || cronsDead,
            },
            metrics: {
                leads_24h: leadsToday,
                queue_pending: queuePending,
                total_published_pages: totalPages,
            },
        });
    } catch (err) {
        console.error('[SystemHealth] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
