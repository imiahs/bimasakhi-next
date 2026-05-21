import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getStuckEvents } from '@/lib/events/eventStore';
import { getFeatureFlag } from '@/lib/featureFlags';
import { getAllFeatureFlags as getOperationalFlags } from '@/lib/system/featureFlags';
import { getSystemMode } from '@/lib/system/systemModes';
import { getDeliveryHealthMetrics } from '@/lib/queue/deliveryTruth';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_DLQ_FILTER = 'operator_status.is.null,operator_status.eq.pending';
const ACTIVE_QUEUE_FILTER = 'operator_status.is.null,operator_status.eq.active';

export const AUTHORITY_CLASSES = Object.freeze({
    FORENSIC: 'FORENSIC',
    LIVE_OPERATIONAL: 'LIVE_OPERATIONAL',
    ESCALATION: 'ESCALATION',
    REPLAY: 'REPLAY',
    DEAD_LETTER: 'DEAD_LETTER',
    OPERATOR_VISIBLE: 'OPERATOR_VISIBLE',
});

const ESCALATION_STALE_MS = DAY_MS;

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

function incidentStateForTimestamp(value, now, staleWindowMs = ESCALATION_STALE_MS) {
    if (!value) return 'HISTORICAL';

    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
        return 'HISTORICAL';
    }

    return now.getTime() - timestamp < staleWindowMs ? 'LIVE' : 'STALE';
}

function mapEscalation(row, now, incidentState = null) {
    return {
        id: row.id,
        severity: row.severity,
        message: row.message,
        retry_count: Number(row.retry_count || 0),
        created_at: row.created_at || null,
        next_escalation_at: row.next_escalation_at || null,
        acknowledged_at: row.acknowledged_at || null,
        acknowledged_by: row.acknowledged_by || null,
        authority_class: AUTHORITY_CLASSES.ESCALATION,
        incident_state: incidentState || incidentStateForTimestamp(row.created_at, now),
    };
}

function buildAuthorityModel() {
    return {
        model: 'shos_authority_v1',
        surfaces: {
            overall_health: AUTHORITY_CLASSES.LIVE_OPERATIONAL,
            operational_summary: AUTHORITY_CLASSES.LIVE_OPERATIONAL,
            forensic_summary: AUTHORITY_CLASSES.FORENSIC,
            escalation_visibility: AUTHORITY_CLASSES.ESCALATION,
            replay_visibility: AUTHORITY_CLASSES.REPLAY,
            dead_letter_visibility: AUTHORITY_CLASSES.DEAD_LETTER,
            operator_lists: AUTHORITY_CLASSES.OPERATOR_VISIBLE,
        },
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
        acknowledgedEscalations,
        recentErrors,
        dailyErrors,
        recentDlqCount,
        totalDlqCount,
        queueFailedCount,
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
        supabase.from('alert_deliveries')
            .select('id, severity, message, retry_count, created_at, next_escalation_at, acknowledged_at, acknowledged_by')
            .eq('acknowledged', true)
            .in('severity', ['P0', 'P1'])
            .order('acknowledged_at', { ascending: false, nullsFirst: false })
            .limit(10)
            .then((result) => result.data || []),
        supabase.from('system_runtime_errors')
            .select('*', { count: 'exact', head: true })
            .eq('resolved', false)
            .gte('created_at', oneHourAgo)
            .then((result) => result.count || 0),
        supabase.from('system_runtime_errors')
            .select('*', { count: 'exact', head: true })
            .eq('resolved', false)
            .gte('created_at', twentyFourHoursAgo)
            .then((result) => result.count || 0),
        supabase.from('job_dead_letters')
            .select('*', { count: 'exact', head: true })
            .or(ACTIVE_DLQ_FILTER)
            .gte('failed_at', twentyFourHoursAgo)
            .then((result) => result.count || 0),
        supabase.from('job_dead_letters')
            .select('*', { count: 'exact', head: true })
            .or(ACTIVE_DLQ_FILTER)
            .then((result) => result.count || 0),
        supabase.from('generation_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed')
            .or(ACTIVE_QUEUE_FILTER)
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
    const liveUnacknowledgedEscalations = unackedEscalations.filter(
        (row) => incidentStateForTimestamp(row.created_at, now) === 'LIVE',
    );
    const staleUnacknowledgedEscalations = unackedEscalations.filter(
        (row) => incidentStateForTimestamp(row.created_at, now) === 'STALE',
    );
    const historicalDeadLetterCount = Math.max((totalDlqCount || 0) - (recentDlqCount || 0), 0);

    const crons = {
        'alert-scan': buildCronStatus(alertScanLast, CRON_DEFINITIONS['alert-scan'], now),
        reconciliation: buildCronStatus(reconciliationLast, CRON_DEFINITIONS.reconciliation, now),
        'event-retry': buildCronStatus(eventRetryLast, CRON_DEFINITIONS['event-retry'], now),
        'vendor-health-check': buildCronStatus(vendorHealthLast, CRON_DEFINITIONS['vendor-health-check'], now),
        'morning-brief': buildCronStatus(morningBriefLast, CRON_DEFINITIONS['morning-brief'], now),
    };

    const operationalHardFailures = [];
    const operationalWarnings = [];
    const forensicHardFailures = [];
    const forensicWarnings = [];

    const deadRequiredCrons = Object.entries(crons)
        .filter(([, cron]) => cron.required && cron.status === 'dead')
        .map(([name]) => name);
    const staleRequiredCrons = Object.entries(crons)
        .filter(([, cron]) => cron.required && cron.status === 'stale')
        .map(([name]) => name);
    const hasCurrentOperationalIncident =
        recentOpenAlerts.length > 0 ||
        recentErrors > 20 ||
        recentDlqCount > 0 ||
        queueFailedCount > 0 ||
        stuckEvents.length > 0 ||
        deliveryMetrics.delivery_failures_recent > 0 ||
        deliveryMetrics.delivery_stuck_count > 0 ||
        deadRequiredCrons.length > 0;

    if (recentOpenAlerts.some((alert) => alert.severity === 'critical')) {
        operationalHardFailures.push('recent_critical_alerts');
        forensicHardFailures.push('recent_critical_alerts');
    }
    if (liveUnacknowledgedEscalations.length > 0) {
        operationalHardFailures.push('unacknowledged_escalations');
    }
    if (staleUnacknowledgedEscalations.length > 0) {
        operationalWarnings.push(`stale_unacknowledged_escalations:${staleUnacknowledgedEscalations.length}`);
    }
    if (unackedEscalations.length > 0) {
        if (hasCurrentOperationalIncident) {
            forensicHardFailures.push('unacknowledged_escalations');
        } else {
            forensicWarnings.push(`historical_unacknowledged_escalations:${unackedEscalations.length}`);
        }
    }
    if (recentErrors > 20) {
        operationalHardFailures.push('error_rate_spike');
        forensicHardFailures.push('error_rate_spike');
    }
    if (recentDlqCount > 0) {
        operationalHardFailures.push('recent_dead_letters');
        forensicHardFailures.push('recent_dead_letters');
    }
    if (queueFailedCount > 0) {
        operationalHardFailures.push('failed_queue_rows');
        forensicHardFailures.push('failed_queue_rows');
    }
    if (stuckEvents.length > 0) {
        operationalHardFailures.push('stuck_events');
        forensicHardFailures.push('stuck_events');
    }
    if (deliveryMetrics.delivery_failures_recent > 0) {
        operationalHardFailures.push('delivery_failures_recent');
        if (hasCurrentOperationalIncident) {
            forensicHardFailures.push('delivery_failures_recent');
        } else {
            forensicWarnings.push(`historical_delivery_failures_recent:${deliveryMetrics.delivery_failures_recent}`);
        }
    }
    if (deliveryMetrics.delivery_stuck_count > 0) {
        operationalHardFailures.push('delivery_stuck_count');
        forensicHardFailures.push('delivery_stuck_count');
    }
    if (deadRequiredCrons.length > 0) {
        operationalHardFailures.push(`dead_required_crons:${deadRequiredCrons.join(',')}`);
        forensicHardFailures.push(`dead_required_crons:${deadRequiredCrons.join(',')}`);
    }

    if (staleRequiredCrons.length > 0) {
        operationalWarnings.push(`stale_required_crons:${staleRequiredCrons.join(',')}`);
        forensicWarnings.push(`stale_required_crons:${staleRequiredCrons.join(',')}`);
    }
    if (staleOpenAlerts.length > 0) {
        forensicWarnings.push(`stale_open_alerts:${staleOpenAlerts.length}`);
    }
    if (historicalDeadLetterCount > 0) {
        forensicWarnings.push(`historical_dead_letters:${historicalDeadLetterCount}`);
    }
    if (deliveryMetrics.delivery_terminal_recent > 0 && deliveryMetrics.delivery_success_rate < 95) {
        operationalWarnings.push(`delivery_success_rate:${deliveryMetrics.delivery_success_rate}`);
        forensicWarnings.push(`delivery_success_rate:${deliveryMetrics.delivery_success_rate}`);
    }

    let overallHealth = 'HEALTHY';
    if (safeMode) {
        overallHealth = 'SAFE_MODE';
    } else if (operationalHardFailures.length > 0) {
        overallHealth = 'DEGRADED';
    }

    let forensicOverallHealth = 'HEALTHY';
    if (safeMode) {
        forensicOverallHealth = 'SAFE_MODE';
    } else if (forensicHardFailures.length > 0) {
        forensicOverallHealth = 'DEGRADED';
    }

    const operationalSummary = {
        status: systemHealthToStatus(overallHealth),
        hard_failures: operationalHardFailures,
        warnings: operationalWarnings,
        overall_health: overallHealth,
    };

    const forensicSummary = {
        status: systemHealthToStatus(forensicOverallHealth),
        hard_failures: forensicHardFailures,
        warnings: forensicWarnings,
        overall_health: forensicOverallHealth,
    };

    const liveEscalationRows = liveUnacknowledgedEscalations.map((row) => mapEscalation(row, now, 'LIVE'));
    const staleEscalationRows = staleUnacknowledgedEscalations.map((row) => mapEscalation(row, now, 'STALE'));
    const acknowledgedEscalationRows = acknowledgedEscalations.map((row) => mapEscalation(row, now, 'ACKNOWLEDGED'));

    return {
        success: true,
        timestamp: now.toISOString(),
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        overall_health: overallHealth,
        summary: operationalSummary,
        operational_summary: operationalSummary,
        forensic_summary: forensicSummary,
        authority: buildAuthorityModel(),
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
            unacknowledged_escalations: liveEscalationRows,
            stale_unacknowledged_escalations: staleEscalationRows,
            acknowledged_escalations_recent: acknowledgedEscalationRows,
            escalation_counts: {
                live: liveEscalationRows.length,
                stale: staleEscalationRows.length,
                acknowledged: acknowledgedEscalationRows.length,
            },
        },
        failures: {
            errors_1h: recentErrors,
            errors_24h: dailyErrors,
            dlq_depth_recent: recentDlqCount,
            dlq_depth_total: totalDlqCount,
            dlq_depth_historical: historicalDeadLetterCount,
            queue_failed: queueFailedCount,
            current_stuck_events: stuckEvents.length,
            delivery_failures_recent: deliveryMetrics.delivery_failures_recent,
            delivery_stuck_count: deliveryMetrics.delivery_stuck_count,
            stuck_events: stuckEvents.map((event) => ({
                id: event.id,
                event_name: event.event_name,
                priority: event.priority,
                dispatched_at: event.dispatched_at,
                authority_class: AUTHORITY_CLASSES.REPLAY,
                incident_state: 'LIVE',
            })),
            has_issues: operationalHardFailures.length > 0,
            forensic_has_issues: forensicHardFailures.length > 0,
        },
        metrics: {
            leads_24h: leadsToday,
            queue_pending: queuePending,
            queue_failed: queueFailedCount,
            total_published_pages: totalPages,
            delivery_success_rate: deliveryMetrics.delivery_success_rate,
            delivery_terminal_recent: deliveryMetrics.delivery_terminal_recent,
            delivery_delivered_recent: deliveryMetrics.delivery_delivered_recent,
            live_unacknowledged_escalations: liveEscalationRows.length,
            stale_unacknowledged_escalations: staleEscalationRows.length,
            acknowledged_escalations_recent: acknowledgedEscalationRows.length,
            historical_dead_letters: historicalDeadLetterCount,
        },
        visibility: {
            active_incidents: {
                authority_class: AUTHORITY_CLASSES.LIVE_OPERATIONAL,
                count: operationalHardFailures.length,
                reasons: operationalHardFailures,
            },
            historical_incidents: {
                authority_class: AUTHORITY_CLASSES.FORENSIC,
                count: staleEscalationRows.length + historicalDeadLetterCount + staleOpenAlerts.length,
                warnings: forensicWarnings,
            },
            escalations: {
                authority_class: AUTHORITY_CLASSES.ESCALATION,
                live_count: liveEscalationRows.length,
                stale_count: staleEscalationRows.length,
                acknowledged_count: acknowledgedEscalationRows.length,
                live: liveEscalationRows,
                stale: staleEscalationRows,
                acknowledged_recent: acknowledgedEscalationRows,
            },
            dead_letters: {
                authority_class: AUTHORITY_CLASSES.DEAD_LETTER,
                active_pending_count: recentDlqCount,
                historical_pending_count: historicalDeadLetterCount,
                total_pending_count: totalDlqCount,
            },
            replay: {
                authority_class: AUTHORITY_CLASSES.REPLAY,
                stuck_events_count: stuckEvents.length,
                stuck_events: stuckEvents.map((event) => ({
                    id: event.id,
                    event_name: event.event_name,
                    priority: event.priority,
                    dispatched_at: event.dispatched_at,
                    authority_class: AUTHORITY_CLASSES.REPLAY,
                    incident_state: 'LIVE',
                })),
            },
        },
    };
}