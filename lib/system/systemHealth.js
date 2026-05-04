import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getStuckEvents } from '@/lib/events/eventStore';
import { getFeatureFlag } from '@/lib/featureFlags';
import { getAllFeatureFlags as getOperationalFlags } from '@/lib/system/featureFlags';
import { getSystemMode } from '@/lib/system/systemModes';
import { getDeliveryHealthMetrics } from '@/lib/queue/deliveryTruth';

const DAY_MS = 24 * 60 * 60 * 1000;

const CRON_DEFINITIONS = {
    'alert-scan': {
        healthyWithinMinutes: 10,
        staleWithinMinutes: 20,
        expected_interval: '5m',
        required: true,
    },
    reconciliation: {
        healthyWithinMinutes: 35,
        staleWithinMinutes: 90,
        expected_interval: '30m',
        required: true,
    },
    'event-retry': {
        healthyWithinMinutes: 10,
        staleWithinMinutes: 20,
        expected_interval: '5m',
        required: true,
    },
    'vendor-health-check': {
        healthyWithinMinutes: 10,
        staleWithinMinutes: 20,
        expected_interval: '5m',
        required: true,
    },
    'morning-brief': {
        healthyWithinMinutes: 26 * 60,
        staleWithinMinutes: 48 * 60,
        expected_interval: '24h',
        required: false,
    },
};

function buildCronStatus(lastRun, definition, now) {
    if (!lastRun?.created_at) {
        return {
            status: definition.required ? 'dead' : 'unknown',
            last_run: null,
            age_minutes: null,
            expected_interval: definition.expected_interval,
            required: definition.required,
        };
    }

    const ageMinutes = Math.round((now.getTime() - new Date(lastRun.created_at).getTime()) / 60000);
    let status = 'dead';

    if (ageMinutes <= definition.healthyWithinMinutes) {
        status = 'healthy';
    } else if (ageMinutes <= definition.staleWithinMinutes) {
        status = 'stale';
    }

    return {
        status,
        last_run: lastRun.created_at,
        age_minutes: ageMinutes,
        expected_interval: definition.expected_interval,
        required: definition.required,
    };
}

function summarizeAlerts(alerts) {
    return {
        total: alerts.length,
        critical: alerts.filter((alert) => alert.severity === 'critical').length,
        high: alerts.filter((alert) => alert.severity === 'high').length,
        medium: alerts.filter((alert) => alert.severity === 'medium').length,
        low: alerts.filter((alert) => alert.severity === 'low').length,
    };
}

export function systemHealthToStatus(overallHealth) {
    return overallHealth === 'HEALTHY' ? 'ok' : 'degraded';
}

export function normalizeHealthForUi(overallHealth) {
    return String(overallHealth || 'UNKNOWN').toLowerCase();
}

export async function getSystemHealthSnapshot() {
    const supabase = getServiceSupabase();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(now.getTime() - DAY_MS).toISOString();
    const alertFreshnessCutoff = now.getTime() - DAY_MS;

    const [
        alertScanLast,
        reconciliationLast,
        morningBriefLast,
        eventRetryLast,
        vendorHealthLast,
        unresolvedAlerts,
        unackedEscalations,
        recentErrors,
        dailyErrors,
        recentDlqCount,
        totalDlqCount,
        systemMode,
        operationalFlags,
        safeMode,
        leadsToday,
        queuePending,
        totalPages,
        stuckEvents,
        deliveryMetrics,
    ] = await Promise.all([
        supabase.from('observability_logs')
            .select('created_at, message')
            .in('level', ['ALERT_SCAN_CLEAN', 'ALERT_SCAN_FIRED'])
            .order('created_at', { ascending: false })
            .limit(1)
            .then((result) => result.data?.[0] || null),
        supabase.from('observability_logs')
            .select('created_at, message')
            .in('level', ['RECONCILIATION_CLEAN', 'RECONCILIATION_ISSUES_FOUND'])
            .order('created_at', { ascending: false })
            .limit(1)
            .then((result) => result.data?.[0] || null),
        supabase.from('observability_logs')
            .select('created_at, message')
            .eq('source', 'morning_brief')
            .order('created_at', { ascending: false })
            .limit(1)
            .then((result) => result.data?.[0] || null),
        supabase.from('observability_logs')
            .select('created_at, message')
            .eq('level', 'RETRY_DAEMON_RUN')
            .order('created_at', { ascending: false })
            .limit(1)
            .then((result) => result.data?.[0] || null),
        supabase.from('observability_logs')
            .select('created_at, message')
            .eq('source', 'vendor_health_check')
            .order('created_at', { ascending: false })
            .limit(1)
            .then((result) => result.data?.[0] || null),
        supabase.from('system_alerts')
            .select('id, alert_type, severity, message, created_at')
            .eq('resolved', false)
            .order('created_at', { ascending: false })
            .then((result) => result.data || []),
        supabase.from('alert_deliveries')
            .select('id, severity, message, retry_count, created_at, next_escalation_at')
            .eq('acknowledged', false)
            .in('severity', ['P0', 'P1'])
            .order('created_at', { ascending: false })
            .limit(10)
            .then((result) => result.data || []),
        supabase.from('system_runtime_errors')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', oneHourAgo)
            .then((result) => result.count || 0),
        supabase.from('system_runtime_errors')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', twentyFourHoursAgo)
            .then((result) => result.count || 0),
        supabase.from('job_dead_letters')
            .select('*', { count: 'exact', head: true })
            .gte('failed_at', twentyFourHoursAgo)
            .then((result) => result.count || 0),
        supabase.from('job_dead_letters')
            .select('*', { count: 'exact', head: true })
            .then((result) => result.count || 0),
        getSystemMode(),
        getOperationalFlags(),
        getFeatureFlag('safe_mode'),
        supabase.from('crm_leads')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', twentyFourHoursAgo)
            .then((result) => result.count || 0),
        supabase.from('generation_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .then((result) => result.count || 0),
        supabase.from('page_index')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published')
            .then((result) => result.count || 0),
        getStuckEvents(15, 20),
        getDeliveryHealthMetrics(),
    ]);

    const recentOpenAlerts = unresolvedAlerts.filter(
        (alert) => new Date(alert.created_at).getTime() >= alertFreshnessCutoff,
    );
    const staleOpenAlerts = unresolvedAlerts.filter(
        (alert) => new Date(alert.created_at).getTime() < alertFreshnessCutoff,
    );

    const crons = {
        'alert-scan': buildCronStatus(alertScanLast, CRON_DEFINITIONS['alert-scan'], now),
        reconciliation: buildCronStatus(reconciliationLast, CRON_DEFINITIONS.reconciliation, now),
        'event-retry': buildCronStatus(eventRetryLast, CRON_DEFINITIONS['event-retry'], now),
        'vendor-health-check': buildCronStatus(vendorHealthLast, CRON_DEFINITIONS['vendor-health-check'], now),
        'morning-brief': buildCronStatus(morningBriefLast, CRON_DEFINITIONS['morning-brief'], now),
    };

    const hardFailures = [];
    const warnings = [];

    const deadRequiredCrons = Object.entries(crons)
        .filter(([, cron]) => cron.required && cron.status === 'dead')
        .map(([name]) => name);
    const staleRequiredCrons = Object.entries(crons)
        .filter(([, cron]) => cron.required && cron.status === 'stale')
        .map(([name]) => name);

    if (recentOpenAlerts.some((alert) => alert.severity === 'critical')) {
        hardFailures.push('recent_critical_alerts');
    }
    if (unackedEscalations.length > 0) {
        hardFailures.push('unacknowledged_escalations');
    }
    if (recentErrors > 20) {
        hardFailures.push('error_rate_spike');
    }
    if (recentDlqCount > 0) {
        hardFailures.push('recent_dead_letters');
    }
    if (stuckEvents.length > 0) {
        hardFailures.push('stuck_events');
    }
    if (deliveryMetrics.delivery_failures_recent > 0) {
        hardFailures.push('delivery_failures_recent');
    }
    if (deliveryMetrics.delivery_stuck_count > 0) {
        hardFailures.push('delivery_stuck_count');
    }
    if (deadRequiredCrons.length > 0) {
        hardFailures.push(`dead_required_crons:${deadRequiredCrons.join(',')}`);
    }

    if (staleRequiredCrons.length > 0) {
        warnings.push(`stale_required_crons:${staleRequiredCrons.join(',')}`);
    }
    if (staleOpenAlerts.length > 0) {
        warnings.push(`stale_open_alerts:${staleOpenAlerts.length}`);
    }
    if (totalDlqCount > 0 && recentDlqCount === 0) {
        warnings.push(`historical_dead_letters:${totalDlqCount}`);
    }
    if (deliveryMetrics.delivery_terminal_recent > 0 && deliveryMetrics.delivery_success_rate < 95) {
        warnings.push(`delivery_success_rate:${deliveryMetrics.delivery_success_rate}`);
    }

    let overallHealth = 'HEALTHY';
    if (safeMode) {
        overallHealth = 'SAFE_MODE';
    } else if (hardFailures.length > 0) {
        overallHealth = 'DEGRADED';
    }

    return {
        success: true,
        timestamp: now.toISOString(),
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        overall_health: overallHealth,
        summary: {
            status: systemHealthToStatus(overallHealth),
            hard_failures: hardFailures,
            warnings,
        },
        system_mode: {
            mode: systemMode,
            safe_mode: safeMode,
            ai_enabled: operationalFlags.ai_enabled?.value ?? false,
            followup_enabled: operationalFlags.followup_enabled?.value ?? false,
            crm_auto_routing: operationalFlags.crm_auto_routing?.value ?? false,
            queue_paused: operationalFlags.queue_paused?.value ?? true,
        },
        control_plane: {
            control_plane_source: 'system_control_config',
            system_mode_source: 'system_control_config',
            operational_flags_source: 'system_control_config',
            safe_mode_source: 'system_control_config',
            conflicting_states_possible: false,
        },
        crons,
        alerts: {
            active: summarizeAlerts(recentOpenAlerts),
            open_recent: recentOpenAlerts,
            stale_open_count: staleOpenAlerts.length,
            stale_open_sample: staleOpenAlerts.slice(0, 10),
            unacknowledged_escalations: unackedEscalations,
        },
        failures: {
            errors_1h: recentErrors,
            errors_24h: dailyErrors,
            dlq_depth_recent: recentDlqCount,
            dlq_depth_total: totalDlqCount,
            current_stuck_events: stuckEvents.length,
            delivery_failures_recent: deliveryMetrics.delivery_failures_recent,
            delivery_stuck_count: deliveryMetrics.delivery_stuck_count,
            stuck_events: stuckEvents.map((event) => ({
                id: event.id,
                event_name: event.event_name,
                priority: event.priority,
                dispatched_at: event.dispatched_at,
            })),
            has_issues: hardFailures.length > 0,
        },
        metrics: {
            leads_24h: leadsToday,
            queue_pending: queuePending,
            total_published_pages: totalPages,
            delivery_success_rate: deliveryMetrics.delivery_success_rate,
            delivery_terminal_recent: deliveryMetrics.delivery_terminal_recent,
            delivery_delivered_recent: deliveryMetrics.delivery_delivered_recent,
        },
    };
}