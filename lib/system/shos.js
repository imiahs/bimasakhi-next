import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { AUTHORITY_CLASSES, getSystemHealthSnapshot } from '@/lib/system/systemHealth';
import { enqueuePageGeneration } from '@/lib/queue/publisher';
import { executeRunbook } from '@/lib/monitoring/runbooks';
import { getBaseUrl, getQStashClient } from '@/lib/queue/qstash';
import { incrementRetry, markDispatched, markFailed } from '@/lib/events/eventStore';
import { getTrigger } from '@/lib/events/triggerMap';
import { recordExternalDelivery, syncExternalDelivery, syncPendingExternalDeliveries } from '@/lib/queue/deliveryTruth';
import { safeLog } from '@/lib/safeLogger';

const SAFE_ENABLE_QUEUE_FAILURE_THRESHOLD = 3;
const DEFAULT_SECTION_LIMIT = 15;
const MAX_SECTION_LIMIT = 50;

const DEFAULT_CONTROL_ROW = {
    safe_mode: false,
    pagegen_enabled: true,
    bulk_generation_enabled: true,
    ai_enabled: false,
    queue_paused: true,
    crm_auto_routing: false,
    followup_enabled: false,
    batch_size: 5,
    updated_at: null,
};

const FEATURE_FLAG_DEFINITIONS = [
    {
        key: 'bulk_generation_enabled',
        label: 'Bulk Generation',
        description: 'Allows bulk planner jobs to dispatch page generation work.',
        safeEnable: true,
    },
    {
        key: 'pagegen_enabled',
        label: 'Page Generation',
        description: 'Allows page generation workers to accept new work.',
        safeEnable: true,
    },
    {
        key: 'ai_enabled',
        label: 'AI Automation',
        description: 'Allows AI-assisted workflows to execute.',
        safeEnable: true,
    },
    {
        key: 'followup_enabled',
        label: 'Followup Automation',
        description: 'Allows followup workflows to send scheduled actions.',
        safeEnable: true,
    },
    {
        key: 'crm_auto_routing',
        label: 'CRM Auto Routing',
        description: 'Allows lead routing and CRM automation to run automatically.',
        safeEnable: true,
    },
    {
        key: 'queue_paused',
        label: 'Queue Pause',
        description: 'Pauses new queue dispatches when enabled.',
        safeEnable: false,
    },
    {
        key: 'safe_mode',
        label: 'Safe Mode',
        description: 'Global safety mode that keeps the system in a constrained operating state.',
        safeEnable: false,
    },
];

function nowIso() {
    return new Date().toISOString();
}

function clampLimit(value, fallback = DEFAULT_SECTION_LIMIT) {
    const parsed = Number.parseInt(String(value ?? fallback), 10);
    if (Number.isNaN(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, MAX_SECTION_LIMIT);
}

function toActorId(user) {
    return user?.email || user?.id || 'system';
}

function jsonObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function jsonArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeMappedAction(candidate) {
    const value = jsonObject(candidate);
    return value.action ? value : null;
}

function normalizeControlRow(row) {
    return {
        ...DEFAULT_CONTROL_ROW,
        ...(row || {}),
    };
}


async function checkMutationSuppression(supabase) {
    return true;
}
function isPendingDlqStatus(status) {
    return !status || status === 'pending';
}

function isActiveDeliveryStatus(status) {
    return !status || status === 'active';
}

function actionSummary(action, fallbackUpdatedAt) {
    if (!action) {
        return {
            last_changed_at: fallbackUpdatedAt || null,
            changed_by: 'unknown/legacy',
            reason: 'legacy state without SHOS history',
            source: 'legacy',
            auto_revert_at: null,
            status: 'legacy',
        };
    }

    return {
        last_changed_at: action.created_at,
        changed_by: action.actor_id || 'system',
        reason: action.reason || 'no reason recorded',
        source: action.source || 'manual',
        auto_revert_at: action.auto_revert_at || null,
        status: action.status || 'applied',
    };
}

function buildSafeEnableChecks(metrics, overallHealth) {
    return [
        {
            id: 'dlq_clear',
            label: 'DLQ = 0',
            passed: metrics.dlq_pending === 0,
            current: metrics.dlq_pending,
        },
        {
            id: 'queue_failed_threshold',
            label: `queue_failed < ${SAFE_ENABLE_QUEUE_FAILURE_THRESHOLD}`,
            passed: metrics.queue_failed < SAFE_ENABLE_QUEUE_FAILURE_THRESHOLD,
            current: metrics.queue_failed,
        },
        {
            id: 'health_not_degraded',
            label: 'system health != DEGRADED',
            passed: overallHealth !== 'DEGRADED',
            current: overallHealth,
        },
    ];
}

function inferAlertRemediation(alert) {
    const metadata = jsonObject(alert.metadata);
    const explicitFixAction = normalizeMappedAction(metadata.fix_action || metadata.shos_fix_action);
    const explicitRetryAction = normalizeMappedAction(metadata.retry_action || metadata.shos_retry_action);

    if (explicitFixAction || explicitRetryAction) {
        return {
            fix_action: explicitFixAction || explicitRetryAction,
            retry_action: explicitRetryAction || explicitFixAction,
        };
    }

    const haystack = `${alert.alert_type || ''} ${alert.message || ''}`.toLowerCase();

    if (haystack.includes('dead letter') || haystack.includes('dlq')) {
        return {
            fix_action: { action: 'dlq_retry_all', label: 'Retry all DLQ items' },
            retry_action: { action: 'dlq_retry_all', label: 'Retry DLQ recovery again' },
        };
    }

    if (haystack.includes('queue') || haystack.includes('pagegen') || haystack.includes('worker')) {
        return {
            fix_action: { action: 'queue_retry_failed', label: 'Retry failed queue jobs' },
            retry_action: { action: 'queue_retry_failed', label: 'Retry queue recovery again' },
        };
    }

    if (haystack.includes('qstash') || haystack.includes('delivery')) {
        return {
            fix_action: { action: 'delivery_retry_all', label: 'Retry failed deliveries' },
            retry_action: { action: 'delivery_retry_all', label: 'Retry delivery recovery again' },
        };
    }

    if (haystack.includes('stuck')) {
        return {
            fix_action: { action: 'run_runbook', runbook: 'stuck_event_recovery', label: 'Recover stuck events' },
            retry_action: { action: 'run_runbook', runbook: 'stuck_event_recovery', label: 'Run stuck recovery again' },
        };
    }

    if (haystack.includes('database') || haystack.includes('supabase') || haystack.includes('db')) {
        return {
            fix_action: { action: 'run_runbook', runbook: 'db_slow', label: 'Stabilize database mode' },
            retry_action: { action: 'run_runbook', runbook: 'db_slow', label: 'Re-run DB stabilization' },
        };
    }

    if (haystack.includes('failure') || haystack.includes('spike')) {
        return {
            fix_action: { action: 'run_runbook', runbook: 'failure_spike', label: 'Stabilize failure spike' },
            retry_action: { action: 'run_runbook', runbook: 'failure_spike', label: 'Re-run stabilization' },
        };
    }

    return {
        fix_action: { action: 'run_runbook', runbook: 'failure_spike', label: 'Run default stabilization' },
        retry_action: { action: 'run_runbook', runbook: 'failure_spike', label: 'Re-run default stabilization' },
    };
}

function inferErrorSource(row, sourceType) {
    const metadata = jsonObject(row.metadata);
    const explicitRetryAction = normalizeMappedAction(metadata.retry_action || metadata.shos_retry_action);

    if (explicitRetryAction) {
        return {
            kind: metadata.kind || 'targeted',
            label: metadata.label || 'Targeted SHOS action',
            retry_action: explicitRetryAction,
        };
    }

    const haystack = `${sourceType} ${row.route || ''} ${row.component || ''} ${row.error_type || ''} ${row.message || ''} ${row.error_message || ''}`.toLowerCase();

    if (haystack.includes('qstash') || haystack.includes('delivery')) {
        return {
            kind: 'delivery',
            label: 'Delivery / QStash',
            retry_action: { action: 'delivery_retry_all', label: 'Retry failed deliveries' },
        };
    }

    if (haystack.includes('queue') || haystack.includes('pagegen') || haystack.includes('worker')) {
        return {
            kind: 'queue',
            label: 'Queue / Worker',
            retry_action: { action: 'queue_retry_failed', label: 'Retry failed queue jobs' },
        };
    }

    if (haystack.includes('alert')) {
        return {
            kind: 'alerts',
            label: 'Alerting',
            retry_action: { action: 'run_runbook', runbook: 'failure_spike', label: 'Re-run stabilization' },
        };
    }

    if (haystack.includes('database') || haystack.includes('supabase') || haystack.includes('db')) {
        return {
            kind: 'database',
            label: 'Database',
            retry_action: { action: 'run_runbook', runbook: 'db_slow', label: 'Stabilize database mode' },
        };
    }

    if (haystack.includes('stuck') || haystack.includes('event_store') || haystack.includes('event')) {
        return {
            kind: 'events',
            label: 'Event Store',
            retry_action: { action: 'run_runbook', runbook: 'stuck_event_recovery', label: 'Recover stuck events' },
        };
    }

    return {
        kind: 'system',
        label: 'System / Unknown',
        retry_action: { action: 'run_runbook', runbook: 'failure_spike', label: 'Run stabilization' },
    };
}

async function insertControlAction(supabase, payload) {
    const record = {
        category: payload.category,
        target_type: payload.target_type,
        target_key: payload.target_key,
        operation: payload.operation,
        actor_id: payload.actor_id || 'system',
        actor_type: payload.actor_type || 'user',
        reason: payload.reason || null,
        source: payload.source || 'manual',
        requested_value: payload.requested_value || null,
        previous_value: payload.previous_value || null,
        result_value: payload.result_value || null,
        metadata: payload.metadata || {},
        reversible: payload.reversible ?? true,
        status: payload.status || 'applied',
        auto_revert_at: payload.auto_revert_at || null,
        reverted_at: payload.reverted_at || null,
        created_at: nowIso(),
        updated_at: nowIso(),
    };

    const { error } = await supabase.from('system_control_actions').insert(record);
    if (error) {
        throw new Error(`Failed to record SHOS action: ${error.message}`);
    }
}

async function getControlRow(supabase) {
    const { data, error } = await supabase
        .from('system_control_config')
        .select('*')
        .eq('singleton_key', true)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load system control config: ${error.message}`);
    }

    return normalizeControlRow(data);
}

async function updateControlRow(supabase, partial) {
    const current = await getControlRow(supabase);
    const nextRow = {
        ...current,
        ...partial,
        singleton_key: true,
        updated_at: nowIso(),
    };

    delete nextRow.id;

    const { error } = await supabase
        .from('system_control_config')
        .upsert(nextRow, { onConflict: 'singleton_key' });

    if (error) {
        throw new Error(`Failed to update system control config: ${error.message}`);
    }

    return normalizeControlRow(nextRow);
}

async function getLatestActionsByTarget(supabase, targetType, targetKeys) {
    if (!targetKeys.length) return {};

    const { data, error } = await supabase
        .from('system_control_actions')
        .select('*')
        .eq('target_type', targetType)
        .in('target_key', targetKeys)
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        throw new Error(`Failed to load SHOS action history: ${error.message}`);
    }

    return (data || []).reduce((acc, row) => {
        if (!acc[row.target_key]) {
            acc[row.target_key] = row;
        }
        return acc;
    }, {});
}

async function processDueFeatureFlagReverts(supabase) {
    const now = nowIso();
    const { data: dueActions, error } = await supabase
        .from('system_control_actions')
        .select('*')
        .eq('category', 'feature_flags')
        .eq('target_type', 'feature_flag')
        .eq('status', 'applied')
        .not('auto_revert_at', 'is', null)
        .is('reverted_at', null)
        .lte('auto_revert_at', now)
        .order('auto_revert_at', { ascending: true })
        .limit(20);

    if (error) {
        throw new Error(`Failed to process SHOS auto reverts: ${error.message}`);
    }

    if (!dueActions?.length) {
        return { reverted: 0 };
    }

    let reverted = 0;
    for (const action of dueActions) {
        const previousValue = Boolean(action.previous_value?.value);
        const controlRow = await getControlRow(supabase);
        const currentValue = Boolean(controlRow[action.target_key]);

        if (currentValue !== previousValue) {
            await updateControlRow(supabase, { [action.target_key]: previousValue });
            await insertControlAction(supabase, {
                category: 'feature_flags',
                target_type: 'feature_flag',
                target_key: action.target_key,
                operation: 'auto_revert',
                actor_id: 'shos:auto-revert',
                actor_type: 'system',
                reason: `Auto revert after scheduled window for ${action.target_key}`,
                source: 'auto_revert',
                previous_value: { value: currentValue },
                result_value: { value: previousValue },
                metadata: { origin_action_created_at: action.created_at },
            });
        }

        const { error: updateError } = await supabase
            .from('system_control_actions')
            .update({
                status: 'reverted',
                reverted_at: nowIso(),
                updated_at: nowIso(),
            })
            .eq('id', action.id);

        if (updateError) {
            throw new Error(`Failed to mark SHOS auto revert: ${updateError.message}`);
        }

        reverted += 1;
    }

    return { reverted };
}

async function getDlqOverview(supabase, limit) {
    const { data, error, count } = await supabase
        .from('job_dead_letters')
        .select('*', { count: 'exact' })
        .or('operator_status.is.null,operator_status.eq.pending')
        .order('failed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Failed to load DLQ entries: ${error.message}`);
    }

    return {
        surface_class: AUTHORITY_CLASSES.OPERATOR_VISIBLE,
        count: count || 0,
        items: (data || []).map((row) => ({
            id: row.id,
            job_run_id: row.job_run_id || row.job_id || null,
            job_class: row.job_class,
            payload: jsonObject(row.payload),
            failure_reason: row.failure_reason || row.error || 'Unknown failure',
            retry_count: Number(row.retry_count || row.attempt_count || row.payload?.retry_count || 0),
            failed_at: row.failed_at || row.created_at,
            operator_status: row.operator_status || 'pending',
            last_retried_at: row.last_retried_at || null,
            last_retried_by: row.last_retried_by || null,
            authority_class: AUTHORITY_CLASSES.DEAD_LETTER,
            incident_state: 'LIVE',
            actions: {
                retry: { action: 'dlq_retry', id: row.id },
                discard: { action: 'dlq_discard', id: row.id },
                resolve: { action: 'dlq_resolve', id: row.id },
            },
        })),
    };
}

async function getQueueFailureOverview(supabase, limit) {
    const { data: rows, error, count } = await supabase
        .from('generation_queue')
        .select('*', { count: 'exact' })
        .eq('status', 'failed')
        .order('completed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Failed to load failed queue rows: ${error.message}`);
    }

    const queueIds = (rows || []).map((row) => row.id);
    const logMap = new Map();

    if (queueIds.length) {
        const { data: logs } = await supabase
            .from('generation_logs')
            .select('queue_id, event_type, message, created_at')
            .in('queue_id', queueIds)
            .order('created_at', { ascending: false });

        for (const log of logs || []) {
            if (!logMap.has(log.queue_id)) {
                logMap.set(log.queue_id, log);
            }
        }
    }

    return {
        surface_class: AUTHORITY_CLASSES.OPERATOR_VISIBLE,
        count: count || 0,
        items: (rows || []).map((row) => {
            const latestLog = logMap.get(row.id);
            return {
                id: row.id,
                task_type: row.task_type,
                slug: row.slug || row.payload?.slug || row.payload?.path || null,
                payload: jsonObject(row.payload),
                retry_count: Number(row.retry_count || 0),
                max_retries: Number(row.max_retries || 0),
                failure_reason: row.error_message || latestLog?.message || 'Failed without recorded reason',
                created_at: row.created_at,
                updated_at: row.completed_at || row.created_at,
                operator_status: row.operator_status || 'active',
                authority_class: AUTHORITY_CLASSES.LIVE_OPERATIONAL,
                incident_state: 'LIVE',
                actions: {
                    retry: { action: 'queue_retry_failed', id: row.id },
                    cancel: { action: 'queue_cancel_failed', id: row.id },
                    clear: { action: 'queue_clear_failed', id: row.id },
                },
            };
        }),
    };
}

async function getDeliveryFailureOverview(supabase, limit) {
    const { data, error, count } = await supabase
        .from('external_delivery_logs')
        .select('*', { count: 'exact' })
        .in('status', ['failed', 'cancelled', 'unknown'])
        .or('operator_status.is.null,operator_status.eq.active')
        .order('failed_at', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Failed to load delivery failures: ${error.message}`);
    }

    return {
        surface_class: AUTHORITY_CLASSES.OPERATOR_VISIBLE,
        count: count || 0,
        items: (data || []).map((row) => ({
            id: row.id,
            provider: row.provider,
            provider_message_id: row.provider_message_id,
            status: row.status,
            operator_status: row.operator_status || 'active',
            source: row.source,
            event_name: row.event_name || 'unknown',
            target_path: row.target_path || row.target_url || null,
            event_store_id: row.event_store_id || null,
            generation_queue_id: row.generation_queue_id || null,
            attempt_count: Number(row.attempt_count || 0),
            provider_retry_count: Number(row.provider_retry_count || 0),
            retry_history: jsonArray(row.attempt_history),
            latest_event: jsonObject(row.latest_event),
            error_payload: jsonObject(row.error_payload),
            failed_at: row.failed_at || row.last_provider_event_at || row.published_at,
            authority_class: AUTHORITY_CLASSES.LIVE_OPERATIONAL,
            incident_state: 'LIVE',
            actions: {
                retry: { action: 'delivery_retry', id: row.id },
                mark_terminal: { action: 'delivery_mark_terminal', id: row.id },
            },
        })),
    };
}

async function getAlertOverview(supabase, limit) {
    const [{ data: alerts, error: alertError, count }, { data: deliveries, error: deliveryError }] = await Promise.all([
        supabase
            .from('system_alerts')
            .select('*', { count: 'exact' })
            .eq('resolved', false)
            .order('created_at', { ascending: false })
            .limit(limit),
        supabase
            .from('alert_deliveries')
            .select('id, alert_type, severity, message, delivery_status, channels_attempted, channels_delivered, acknowledged, acknowledged_at, next_escalation_at, created_at')
            .eq('acknowledged', false)
            .order('created_at', { ascending: false })
            .limit(limit * 2),
    ]);

    if (alertError) {
        throw new Error(`Failed to load system alerts: ${alertError.message}`);
    }

    if (deliveryError) {
        throw new Error(`Failed to load alert deliveries: ${deliveryError.message}`);
    }

    const deliveryMap = new Map();
    for (const delivery of deliveries || []) {
        const key = `${delivery.alert_type}:${delivery.message}`;
        if (!deliveryMap.has(key)) {
            deliveryMap.set(key, delivery);
        }
    }

    return {
        surface_class: AUTHORITY_CLASSES.OPERATOR_VISIBLE,
        count: count || 0,
        items: (alerts || []).map((alert) => {
            const remediation = inferAlertRemediation(alert);
            const delivery = deliveryMap.get(`${alert.alert_type}:${alert.message}`) || null;
            return {
                id: alert.id,
                alert_type: alert.alert_type,
                severity: alert.severity,
                message: alert.message,
                metadata: jsonObject(alert.metadata),
                created_at: alert.created_at,
                delivery,
                authority_class: AUTHORITY_CLASSES.LIVE_OPERATIONAL,
                incident_state: 'LIVE',
                fix_action: remediation.fix_action,
                retry_action: remediation.retry_action,
                resolve_action: { action: 'alert_resolve', id: alert.id },
            };
        }),
    };
}

async function getErrorOverview(supabase, limit) {
    const [{ data: runtimeErrors, error: runtimeError, count: runtimeCount }, { data: legacyErrors, error: legacyError, count: legacyCount }] = await Promise.all([
        supabase
            .from('system_runtime_errors')
            .select('*', { count: 'exact' })
            .eq('resolved', false)
            .order('created_at', { ascending: false })
            .limit(limit),
        supabase
            .from('system_errors')
            .select('*', { count: 'exact' })
            .eq('resolved', false)
            .order('created_at', { ascending: false })
            .limit(limit),
    ]);

    if (runtimeError) {
        throw new Error(`Failed to load runtime errors: ${runtimeError.message}`);
    }

    if (legacyError) {
        throw new Error(`Failed to load system errors: ${legacyError.message}`);
    }

    const normalizedRuntime = (runtimeErrors || []).map((row) => {
        const sourceMapping = inferErrorSource(row, 'system_runtime_errors');
        return {
            id: row.id,
            source_type: 'system_runtime_errors',
            message: row.error_message,
            stack_trace: row.stack_trace || null,
            created_at: row.created_at,
            route: row.route || null,
            source_mapping: sourceMapping,
            authority_class: AUTHORITY_CLASSES.LIVE_OPERATIONAL,
            incident_state: 'LIVE',
            retry_action: sourceMapping.retry_action,
            resolve_action: { action: 'error_resolve', id: row.id, source_type: 'system_runtime_errors' },
        };
    });

    const normalizedLegacy = (legacyErrors || []).map((row) => {
        const sourceMapping = inferErrorSource(row, 'system_errors');
        return {
            id: row.id,
            source_type: 'system_errors',
            message: row.message,
            stack_trace: row.stack_trace || null,
            created_at: row.created_at,
            error_type: row.error_type || null,
            component: row.component || null,
            source_mapping: sourceMapping,
            authority_class: AUTHORITY_CLASSES.LIVE_OPERATIONAL,
            incident_state: 'LIVE',
            retry_action: sourceMapping.retry_action,
            resolve_action: { action: 'error_resolve', id: row.id, source_type: 'system_errors' },
        };
    });

    const items = [...normalizedRuntime, ...normalizedLegacy]
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
        .slice(0, limit);

    return {
        count: (runtimeCount || 0) + (legacyCount || 0),
        items,
    };
}

async function getEventFailureOverview(supabase, limit) {
    const { data, error, count } = await supabase
        .from('event_store')
        .select('*', { count: 'exact' })
        .eq('status', 'failed')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Failed to load event store failures: ${error.message}`);
    }

    return {
        surface_class: AUTHORITY_CLASSES.OPERATOR_VISIBLE,
        count: count || 0,
        items: (data || []).map((row) => {
            const trigger = getTrigger(row.event_name);
            const dispatchable = Boolean(trigger?.action === 'queue_job' && trigger?.endpoint);
            return {
                id: row.id,
                event_name: row.event_name,
                status: row.status,
                priority: row.priority,
                retry_count: Number(row.retry_count || 0),
                max_retries: Number(row.max_retries || 0),
                created_at: row.created_at,
                updated_at: row.updated_at || row.created_at,
                last_error: row.last_error || null,
                payload: jsonObject(row.payload),
                execution_context: jsonObject(row.execution_context),
                authority_class: AUTHORITY_CLASSES.REPLAY,
                incident_state: 'LIVE',
                trigger: trigger
                    ? {
                        executive: trigger.executive,
                        endpoint: trigger.endpoint,
                        action: trigger.action,
                    }
                    : null,
                actions: {
                    retry: dispatchable ? { action: 'event_retry', id: row.id } : null,
                    resolve: { action: 'event_resolve', id: row.id },
                },
            };
        }),
    };
}

function buildFeatureFlags(controlRow, actionMap, metrics, health) {
    return FEATURE_FLAG_DEFINITIONS.map((definition) => {
        const lastAction = actionMap[definition.key] || null;
        const checks = definition.safeEnable
            ? buildSafeEnableChecks(metrics, health.operational_summary?.overall_health || health.overall_health)
            : [];
        const canEnableSafely = definition.safeEnable ? checks.every((check) => check.passed) : true;

        return {
            key: definition.key,
            label: definition.label,
            description: definition.description,
            value: Boolean(controlRow[definition.key]),
            safe_enable_supported: definition.safeEnable,
            can_enable_safely: canEnableSafely,
            validation_checks: checks,
            history: actionSummary(lastAction, controlRow.updated_at),
            actions: {
                enable_with_validation: definition.safeEnable ? { action: 'feature_flag_set', key: definition.key, mode: 'validated' } : null,
                force_enable: { action: 'feature_flag_set', key: definition.key, mode: 'force' },
                disable: { action: 'feature_flag_set', key: definition.key, mode: 'disable' },
            },
        };
    });
}

function buildOperatorMetrics({ health, dlq, queueFailures, deliveries, eventFailures, alerts, errors }) {
    return {
        overall_health: health.operational_summary?.overall_health || health.overall_health,
        forensic_overall_health: health.forensic_summary?.overall_health || health.overall_health,
        dlq_pending: dlq.count,
        queue_failed: queueFailures.count,
        delivery_failed: deliveries.count,
        event_failed: eventFailures.count,
        alerts_open: alerts.count,
        errors_open: errors.count,
        live_unacknowledged_escalations: health.visibility?.escalations?.live_count ?? 0,
        stale_unacknowledged_escalations: health.visibility?.escalations?.stale_count ?? 0,
        acknowledged_escalations_recent: health.visibility?.escalations?.acknowledged_count ?? 0,
        historical_dead_letters: health.visibility?.dead_letters?.historical_pending_count ?? 0,
        queue_pending: health.metrics?.queue_pending ?? 0,
        delivery_success_rate: health.metrics?.delivery_success_rate ?? 0,
    };
}

function buildEscalationOverview(health) {
    const visibility = health.visibility?.escalations || {};

    return {
        surface_class: AUTHORITY_CLASSES.OPERATOR_VISIBLE,
        authority_class: AUTHORITY_CLASSES.ESCALATION,
        live_count: visibility.live_count ?? 0,
        stale_count: visibility.stale_count ?? 0,
        acknowledged_count: visibility.acknowledged_count ?? 0,
        live: visibility.live || [],
        stale: visibility.stale || [],
        acknowledged: visibility.acknowledged_recent || [],
    };
}

function buildHistoricalIncidentOverview(health) {
    const items = [];
    const deadLetters = health.visibility?.dead_letters?.historical_pending_count ?? 0;
    const staleEscalations = health.visibility?.escalations?.stale_count ?? 0;
    const staleAlerts = health.alerts?.stale_open_count ?? 0;

    if (deadLetters > 0) {
        items.push({
            id: 'historical_dead_letters',
            label: 'Historical dead letters',
            count: deadLetters,
            detail: 'Older dead-letter residue remains preserved for forensic continuity and no longer drives live operator authority.',
            authority_class: AUTHORITY_CLASSES.DEAD_LETTER,
            incident_state: 'HISTORICAL',
        });
    }

    if (staleEscalations > 0) {
        items.push({
            id: 'stale_unacknowledged_escalations',
            label: 'Stale unacknowledged escalations',
            count: staleEscalations,
            detail: 'Escalation residue remains visible as escalation history and must not be treated as live operator backlog by itself.',
            authority_class: AUTHORITY_CLASSES.ESCALATION,
            incident_state: 'STALE',
        });
    }

    if (staleAlerts > 0) {
        items.push({
            id: 'stale_open_alerts',
            label: 'Stale open alerts',
            count: staleAlerts,
            detail: 'Older unresolved alerts remain preserved for audit visibility.',
            authority_class: AUTHORITY_CLASSES.FORENSIC,
            incident_state: 'HISTORICAL',
        });
    }

    return {
        surface_class: AUTHORITY_CLASSES.FORENSIC,
        count: items.length,
        items,
        warnings: health.forensic_summary?.warnings || [],
    };
}

function buildReplayOverview(health, eventFailures) {
    return {
        surface_class: AUTHORITY_CLASSES.OPERATOR_VISIBLE,
        authority_class: AUTHORITY_CLASSES.REPLAY,
        count: eventFailures.count,
        items: eventFailures.items,
        stuck_events_count: health.visibility?.replay?.stuck_events_count ?? 0,
        stuck_events: health.visibility?.replay?.stuck_events || [],
    };
}

async function retryEventStoreDispatch(eventStoreId, source = 'shos_delivery_retry') {
    const supabase = getServiceSupabase();
    const { data: eventStoreRow, error } = await supabase
        .from('event_store')
        .select('*')
        .eq('id', eventStoreId)
        .single();

    if (error || !eventStoreRow) {
        throw new Error('Event not found in event_store');
    }

    const trigger = getTrigger(eventStoreRow.event_name);
    if (!trigger || trigger.action !== 'queue_job' || !trigger.endpoint) {
        throw new Error(`No dispatchable trigger for event: ${eventStoreRow.event_name}`);
    }

    const client = getQStashClient();
    if (!client) {
        throw new Error('QStash token is not configured');
    }

    try {
        await incrementRetry(eventStoreId);

        const targetUrl = `${getBaseUrl()}${trigger.endpoint}`;
        const dispatchPayload = {
            ...jsonObject(eventStoreRow.payload),
            _execution_context: eventStoreRow.execution_context,
            _event_name: eventStoreRow.event_name,
            _executive: trigger.executive,
            _event_store_id: eventStoreId,
            _shos_retry: true,
        };

        const result = await client.publishJSON({
            url: targetUrl,
            body: dispatchPayload,
        });

        await markDispatched(eventStoreId, result.messageId);

        try {
            await recordExternalDelivery({
                messageId: result.messageId,
                source,
                eventName: eventStoreRow.event_name,
                eventStoreId,
                generationQueueId: eventStoreRow.payload?.queueId || eventStoreRow.payload?.queue_id || null,
                targetUrl,
                targetPath: trigger.endpoint,
                requestPayload: dispatchPayload,
                providerResponse: result,
            });
        } catch (deliveryError) {
            await safeLog('SHOS_DELIVERY_TRUTH_WRITE_FAILED', deliveryError.message, {
                source,
                event_name: eventStoreRow.event_name,
                event_store_id: eventStoreId,
                message_id: result.messageId,
                target_url: targetUrl,
            });
        }

        return {
            success: true,
            message_id: result.messageId,
            event_store_id: eventStoreId,
        };
    } catch (dispatchError) {
        await markFailed(eventStoreId, dispatchError.message);
        throw dispatchError;
    }
}

async function runMappedAction(mappedAction, user, reason) {
    if (!mappedAction?.action) {
        throw new Error('No mapped action available');
    }

    if (mappedAction.action === 'run_runbook') {
        const runbookResult = await executeRunbook(mappedAction.runbook);
        if (!runbookResult.success) {
            throw new Error(runbookResult.error || 'Runbook execution failed');
        }

        return {
            action: 'run_runbook',
            runbook: mappedAction.runbook,
            result: runbookResult.result,
        };
    }

    return performShosAction({ ...mappedAction, reason }, user);
}

async function retryDlqEntries(supabase, rows, user, reason) {
    let retried = 0;
    const createdJobs = [];

    for (const row of rows) {
        if (!isPendingDlqStatus(row.operator_status)) {
            continue;
        }

        const insertPayload = {
            job_class: row.job_class,
            payload: jsonObject(row.payload),
            status: 'pending',
            error: null,
            created_at: nowIso(),
        };

        const { data: newRun, error: insertError } = await supabase
            .from('job_runs')
            .insert(insertPayload)
            .select('id')
            .single();

        if (insertError) {
            throw new Error(`Failed to create retry job for DLQ item ${row.id}: ${insertError.message}`);
        }

        const { error: updateError } = await supabase
            .from('job_dead_letters')
            .update({
                operator_status: 'retried',
                operator_notes: reason || 'Retried from SHOS',
                last_retried_at: nowIso(),
                last_retried_by: toActorId(user),
            })
            .eq('id', row.id);

        if (updateError) {
            throw new Error(`Failed to update DLQ item ${row.id}: ${updateError.message}`);
        }

        createdJobs.push(newRun.id);
        retried += 1;
    }

    await insertControlAction(supabase, {
        category: 'dlq',
        target_type: 'job_dead_letter',
        target_key: rows.length === 1 ? rows[0].id : 'bulk',
        operation: rows.length === 1 ? 'retry' : 'retry_all',
        actor_id: toActorId(user),
        reason,
        source: 'shos',
        metadata: { ids: rows.map((row) => row.id), created_jobs: createdJobs },
    });

    return { retried, created_jobs: createdJobs };
}

async function resolveDlqEntries(supabase, rows, user, reason, nextStatus) {
    if (!rows.length) {
        return { updated: 0 };
    }

    const ids = rows.map((row) => row.id);
    const { data: updated, error } = await supabase
        .from('job_dead_letters')
        .update({
            operator_status: nextStatus,
            operator_notes: reason || `Marked ${nextStatus} from SHOS`,
            resolved_at: nowIso(),
            resolved_by: toActorId(user),
        })
        .in('id', ids)
        .select('id');

    if (error) {
        throw new Error(`Failed to update DLQ entries: ${error.message}`);
    }

    await insertControlAction(supabase, {
        category: 'dlq',
        target_type: 'job_dead_letter',
        target_key: ids.length === 1 ? ids[0] : 'bulk',
        operation: nextStatus,
        actor_id: toActorId(user),
        reason,
        source: 'shos',
        metadata: { ids, next_status: nextStatus },
    });

    return { updated: updated?.length || 0, status: nextStatus };
}

async function requeueDlqEntries(supabase, rows, user, reason) {
    const requeueableRows = rows.filter((row) => !isPendingDlqStatus(row.operator_status));
    if (!requeueableRows.length) {
        return { requeued: 0 };
    }

    const ids = requeueableRows.map((row) => row.id);
    const { data: updated, error } = await supabase
        .from('job_dead_letters')
        .update({
            operator_status: 'pending',
            operator_notes: reason || 'Requeued from SHOS',
            resolved_at: null,
            resolved_by: null,
        })
        .in('id', ids)
        .select('id');

    if (error) {
        throw new Error(`Failed to requeue DLQ entries: ${error.message}`);
    }

    await insertControlAction(supabase, {
        category: 'dlq',
        target_type: 'job_dead_letter',
        target_key: ids.length === 1 ? ids[0] : 'bulk',
        operation: 'requeue',
        actor_id: toActorId(user),
        reason,
        source: 'shos',
        metadata: { ids },
    });

    return { requeued: updated?.length || 0 };
}

async function fetchDlqRowsForAction(supabase, id, includeHandled = false) {
    let query = supabase
        .from('job_dead_letters')
        .select('*')
        .order('failed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

    if (!includeHandled) {
        query = query.or('operator_status.is.null,operator_status.eq.pending');
    }

    if (id) {
        query = query.eq('id', id).limit(1);
    } else {
        query = query.limit(MAX_SECTION_LIMIT);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error(`Failed to load DLQ rows: ${error.message}`);
    }
    return data || [];
}

async function fetchQueueRowsForAction(supabase, id) {
    let query = supabase
        .from('generation_queue')
        .select('*')
        .eq('status', 'failed')
        .order('completed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

    if (id) {
        query = query.eq('id', id).limit(1);
    } else {
        query = query.limit(MAX_SECTION_LIMIT);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error(`Failed to load failed queue rows: ${error.message}`);
    }
    return data || [];
}

async function retryQueueRows(supabase, rows, user, reason) {
    let reset = 0;
    const dispatched = [];

    for (const row of rows) {
        const { error: updateError } = await supabase
            .from('generation_queue')
            .update({
                status: 'pending',
                error_message: null,
                operator_status: 'active',
                operator_notes: reason || 'Retried from SHOS',
                resolved_at: null,
                resolved_by: null,
                last_retried_at: nowIso(),
                last_retried_by: toActorId(user),
            })
            .eq('id', row.id)
            .eq('status', 'failed');

        if (updateError) {
            throw new Error(`Failed to reset queue row ${row.id}: ${updateError.message}`);
        }

        reset += 1;

        if (row.task_type === 'pagegen') {
            const dispatchPayload = {
                ...jsonObject(row.payload),
                queueId: row.id,
                queue_id: row.id,
            };
            const dispatchResult = await enqueuePageGeneration(dispatchPayload);
            dispatched.push({ id: row.id, message_id: dispatchResult?.messageId || null });
        }
    }

    await insertControlAction(supabase, {
        category: 'queue',
        target_type: 'generation_queue',
        target_key: rows.length === 1 ? rows[0].id : 'bulk',
        operation: rows.length === 1 ? 'retry_failed' : 'retry_failed_bulk',
        actor_id: toActorId(user),
        reason,
        source: 'shos',
        metadata: { ids: rows.map((row) => row.id), dispatched },
    });

    return { reset, dispatched };
}

async function clearQueueRows(supabase, rows, user, reason, nextStatus) {
    if (!rows.length) {
        return { cleared: 0 };
    }

    const ids = rows.map((row) => row.id);
    const { data: updated, error } = await supabase
        .from('generation_queue')
        .update({
            status: nextStatus === 'cancelled' ? 'cancelled' : rowStatusForClear(nextStatus),
            operator_status: nextStatus,
            operator_notes: reason || `Marked ${nextStatus} from SHOS`,
            resolved_at: nowIso(),
            resolved_by: toActorId(user),
        })
        .in('id', ids)
        .select('id');

    if (error) {
        throw new Error(`Failed to clear queue rows: ${error.message}`);
    }

    await insertControlAction(supabase, {
        category: 'queue',
        target_type: 'generation_queue',
        target_key: ids.length === 1 ? ids[0] : 'bulk',
        operation: nextStatus === 'cancelled' ? 'cancel_failed' : 'clear_failed',
        actor_id: toActorId(user),
        reason,
        source: 'shos',
        metadata: { ids, next_status: nextStatus },
    });

    return { cleared: updated?.length || 0, status: nextStatus };
}

function rowStatusForClear(nextStatus) {
    return nextStatus === 'cleared' ? 'cancelled' : nextStatus;
}

async function fetchDeliveryRowsForAction(supabase, id) {
    let query = supabase
        .from('external_delivery_logs')
        .select('*')
        .in('status', ['failed', 'cancelled', 'unknown'])
        .or('operator_status.is.null,operator_status.eq.active')
        .order('failed_at', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false });

    if (id) {
        query = query.eq('id', id).limit(1);
    } else {
        query = query.limit(MAX_SECTION_LIMIT);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error(`Failed to load delivery rows: ${error.message}`);
    }
    return data || [];
}

async function retryDeliveryRow(supabase, row, user, reason) {
    let result = null;

    if (row.event_store_id) {
        result = await retryEventStoreDispatch(row.event_store_id, 'shos_delivery_retry');
    } else if (row.generation_queue_id) {
        const queueRows = await fetchQueueRowsForAction(supabase, row.generation_queue_id);
        if (queueRows.length) {
            result = await retryQueueRows(supabase, queueRows, user, reason || 'Retry delivery-linked queue row');
        }
    }

    if (!result && row.provider_message_id) {
        result = await syncExternalDelivery(row.provider_message_id);
    }

    if (!result) {
        throw new Error('No retry path available for delivery');
    }

    const { error: updateError } = await supabase
        .from('external_delivery_logs')
        .update({
            operator_status: 'resolved',
            operator_notes: reason || 'Retried from SHOS',
            resolved_at: nowIso(),
            resolved_by: toActorId(user),
            updated_at: nowIso(),
        })
        .eq('id', row.id);

    if (updateError) {
        throw new Error(`Failed to update delivery row ${row.id}: ${updateError.message}`);
    }

    await insertControlAction(supabase, {
        category: 'delivery',
        target_type: 'external_delivery_log',
        target_key: row.id,
        operation: 'retry',
        actor_id: toActorId(user),
        reason,
        source: 'shos',
        metadata: {
            provider_message_id: row.provider_message_id,
            event_store_id: row.event_store_id,
            generation_queue_id: row.generation_queue_id,
        },
    });

    return result;
}

async function markDeliveryTerminal(supabase, rows, user, reason) {
    const ids = rows.map((row) => row.id);
    const { data: updated, error } = await supabase
        .from('external_delivery_logs')
        .update({
            operator_status: 'terminal',
            operator_notes: reason || 'Marked terminal from SHOS',
            resolved_at: nowIso(),
            resolved_by: toActorId(user),
            updated_at: nowIso(),
        })
        .in('id', ids)
        .select('id');

    if (error) {
        throw new Error(`Failed to update delivery rows: ${error.message}`);
    }

    await insertControlAction(supabase, {
        category: 'delivery',
        target_type: 'external_delivery_log',
        target_key: ids.length === 1 ? ids[0] : 'bulk',
        operation: 'mark_terminal',
        actor_id: toActorId(user),
        reason,
        source: 'shos',
        metadata: { ids },
    });

    return { terminal: updated?.length || 0 };
}

async function fetchEventRowsForAction(supabase, id) {
    let query = supabase
        .from('event_store')
        .select('*')
        .eq('status', 'failed')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

    if (id) {
        query = query.eq('id', id).limit(1);
    } else {
        query = query.limit(MAX_SECTION_LIMIT);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error(`Failed to load failed event rows: ${error.message}`);
    }
    return data || [];
}

async function retryEventRows(supabase, rows, user, reason) {
    const results = [];

    for (const row of rows) {
        const result = await retryEventStoreDispatch(row.id, 'shos_event_retry');

        await insertControlAction(supabase, {
            category: 'events',
            target_type: 'event_store',
            target_key: row.id,
            operation: 'retry',
            actor_id: toActorId(user),
            reason,
            source: 'shos',
            metadata: {
                event_name: row.event_name,
                message_id: result.message_id,
            },
        });

        results.push({
            id: row.id,
            event_name: row.event_name,
            ...result,
        });
    }

    return { retried: results.length, results };
}

async function resolveEventRows(supabase, rows, user, reason) {
    const ids = rows.map((row) => row.id);
    const { data: updated, error } = await supabase
        .from('event_store')
        .update({
            status: 'skipped',
            updated_at: nowIso(),
        })
        .in('id', ids)
        .eq('status', 'failed')
        .select('id, event_name, status');

    if (error) {
        throw new Error(`Failed to resolve failed event rows: ${error.message}`);
    }

    await insertControlAction(supabase, {
        category: 'events',
        target_type: 'event_store',
        target_key: ids.length === 1 ? ids[0] : 'bulk',
        operation: 'resolve',
        actor_id: toActorId(user),
        reason,
        source: 'shos',
        metadata: {
            ids,
            event_names: rows.map((row) => row.event_name),
        },
    });

    return {
        resolved: updated?.length || 0,
        ids,
    };
}

async function resolveAlert(supabase, alertId, user, reason) {
    const { data: alert, error } = await supabase
        .from('system_alerts')
        .update({ resolved: true })
        .eq('id', alertId)
        .eq('resolved', false)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve alert: ${error.message}`);
    }

    if (!alert) {
        throw new Error('Alert not found or already resolved');
    }

    await supabase
        .from('alert_deliveries')
        .update({
            acknowledged: true,
            acknowledged_at: nowIso(),
            acknowledged_by: toActorId(user),
        })
        .eq('acknowledged', false)
        .eq('alert_type', alert.alert_type)
        .eq('message', alert.message);

    await insertControlAction(supabase, {
        category: 'alerts',
        target_type: 'system_alert',
        target_key: alertId,
        operation: 'resolve',
        actor_id: toActorId(user),
        reason,
        source: 'shos',
        metadata: { alert_type: alert.alert_type, message: alert.message },
    });

    return { resolved: true, alert_id: alertId };
}

async function resolveError(supabase, sourceType, id, user, reason) {
    const tableName = sourceType === 'system_runtime_errors' ? 'system_runtime_errors' : 'system_errors';
    const updatePayload = tableName === 'system_runtime_errors'
        ? {
            resolved: true,
        }
        : {
            resolved: true,
            resolved_at: nowIso(),
            resolved_by: toActorId(user),
        };
    const { data, error } = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq('id', id)
        .eq('resolved', false)
        .select('id')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve error: ${error.message}`);
    }

    if (!data) {
        throw new Error('Error not found or already resolved');
    }

    await insertControlAction(supabase, {
        category: 'errors',
        target_type: tableName,
        target_key: id,
        operation: 'resolve',
        actor_id: toActorId(user),
        reason,
        source: 'shos',
    });

    return { resolved: true, source_type: sourceType, id };
}

export async function getShosSnapshot(options = {}) {
    const supabase = getServiceSupabase();
    const limits = {
        dlq: clampLimit(options.dlqLimit),
        queue: clampLimit(options.queueLimit),
        delivery: clampLimit(options.deliveryLimit),
        events: clampLimit(options.eventLimit),
        alerts: clampLimit(options.alertLimit),
        errors: clampLimit(options.errorLimit),
    };

    const suppressionEnabled = await checkMutationSuppression(supabase);
    const autoReverts = suppressionEnabled ? { reverted: 0, suppressed: true } : await processDueFeatureFlagReverts(supabase);

    const [controlRow, health, dlq, queueFailures, deliveries, eventFailures, alerts, errors, actionMap] = await Promise.all([
        getControlRow(supabase),
        getSystemHealthSnapshot(),
        getDlqOverview(supabase, limits.dlq),
        getQueueFailureOverview(supabase, limits.queue),
        getDeliveryFailureOverview(supabase, limits.delivery),
        getEventFailureOverview(supabase, limits.events),
        getAlertOverview(supabase, limits.alerts),
        getErrorOverview(supabase, limits.errors),
        getLatestActionsByTarget(supabase, 'feature_flag', FEATURE_FLAG_DEFINITIONS.map((item) => item.key)),
    ]);

    const metrics = buildOperatorMetrics({ health, dlq, queueFailures, deliveries, eventFailures, alerts, errors });
    const escalations = buildEscalationOverview(health);
    const historicalIncidents = buildHistoricalIncidentOverview(health);
    const replay = buildReplayOverview(health, eventFailures);

    return {
        success: true,
        timestamp: nowIso(),
        source: 'shos',
        authority_model: health.authority,
        auto_reverts: autoReverts,
        metrics,
        control_plane: {
            source: 'system_control_config',
            updated_at: controlRow.updated_at,
        },
        feature_flags: buildFeatureFlags(controlRow, actionMap, metrics, health),
        dlq,
        queue_failures: queueFailures,
        delivery_failures: deliveries,
        event_failures: eventFailures,
        replay,
        alerts,
        errors,
        escalations,
        historical_incidents: historicalIncidents,
        health,
        consistency: {
            canonical_source: 'shos',
            operational_health: health.operational_summary?.overall_health || health.overall_health,
            forensic_health: health.forensic_summary?.overall_health || health.overall_health,
            dlq_pending: metrics.dlq_pending,
            queue_failed: metrics.queue_failed,
            delivery_failed: metrics.delivery_failed,
            event_failed: metrics.event_failed,
            live_unacknowledged_escalations: metrics.live_unacknowledged_escalations,
            stale_unacknowledged_escalations: metrics.stale_unacknowledged_escalations,
            historical_dead_letters: metrics.historical_dead_letters,
            matches_health_dlq_total: metrics.dlq_pending === (health.visibility?.dead_letters?.active_pending_count ?? metrics.dlq_pending),
            matches_forensic_dlq_total: metrics.dlq_pending === (health.failures?.dlq_depth_total ?? metrics.dlq_pending),
        },
    };
}

export async function performShosAction(input, user) {
    const supabase = getServiceSupabase();
    const action = input?.action;
    const reason = input?.reason || null;

    if (!action) {
        throw new Error('action is required');
    }

    const suppressionEnabled = await checkMutationSuppression(supabase);

    if (suppressionEnabled) {
        await insertControlAction(supabase, {
            category: 'shos_suppression',
            target_type: 'shos_action',
            target_key: action,
            operation: 'suppressed_execution_attempt',
            actor_id: toActorId(user),
            reason: reason || 'Operator attempted SHOS action during suppressed mode',
            source: 'shos_suppression',
            metadata: {
                action,
                input_keys: Object.keys(input || {}),
                suppression_mode: 'first_deploy_mutation_suppression',
            },
        });

        return {
            success: false,
            action,
            error: 'SHOS mutation authority suppressed for deployment safety',
            suppressed: true,
            suppression_reason: 'first_deploy_mutation_suppression',
            suppression_timestamp: nowIso(),
        };
    }

    if (action === 'feature_flag_set') {
        const { key, mode = 'validated', auto_revert_minutes: autoRevertMinutes } = input;
        if (!FEATURE_FLAG_DEFINITIONS.some((definition) => definition.key === key)) {
            throw new Error(`Unknown feature flag: ${key}`);
        }

        const controlRow = await getControlRow(supabase);
        const currentValue = Boolean(controlRow[key]);
        const nextValue = mode === 'disable' ? false : true;

        if (currentValue === nextValue) {
            return { success: true, changed: false, key, value: currentValue };
        }

        if (mode === 'validated') {
            const snapshot = await getShosSnapshot();
            const definition = FEATURE_FLAG_DEFINITIONS.find((item) => item.key === key);
            if (definition?.safeEnable) {
                const checks = buildSafeEnableChecks(snapshot.metrics, snapshot.metrics.overall_health);
                const failedChecks = checks.filter((check) => !check.passed);
                if (failedChecks.length) {
                    return {
                        success: false,
                        action,
                        key,
                        value: currentValue,
                        error: 'Validation failed for safe enable',
                        validation_checks: checks,
                    };
                }
            }
        }

        const updatedControl = await updateControlRow(supabase, { [key]: nextValue });
        const autoRevertAt = nextValue && Number(autoRevertMinutes) > 0
            ? new Date(Date.now() + Number(autoRevertMinutes) * 60 * 1000).toISOString()
            : null;

        await insertControlAction(supabase, {
            category: 'feature_flags',
            target_type: 'feature_flag',
            target_key: key,
            operation: mode === 'disable' ? 'disable' : mode === 'force' ? 'force_enable' : 'enable_with_validation',
            actor_id: toActorId(user),
            reason,
            source: mode === 'force' ? 'override' : 'shos',
            requested_value: { value: nextValue },
            previous_value: { value: currentValue },
            result_value: { value: nextValue },
            metadata: {
                auto_revert_minutes: Number(autoRevertMinutes) || 0,
                mode,
            },
            auto_revert_at: autoRevertAt,
        });

        return {
            success: true,
            action,
            key,
            previous_value: currentValue,
            value: Boolean(updatedControl[key]),
            auto_revert_at: autoRevertAt,
        };
    }

    if (action === 'dlq_retry' || action === 'dlq_retry_all') {
        const rows = await fetchDlqRowsForAction(supabase, input.id || null);
        const result = await retryDlqEntries(supabase, rows, user, reason);
        return { success: true, action, ...result };
    }

    if (action === 'dlq_discard' || action === 'dlq_clear_all') {
        const rows = await fetchDlqRowsForAction(supabase, input.id || null);
        const result = await resolveDlqEntries(supabase, rows, user, reason, action === 'dlq_discard' ? 'discarded' : 'resolved');
        return { success: true, action, ...result };
    }

    if (action === 'dlq_resolve') {
        const rows = await fetchDlqRowsForAction(supabase, input.id || null);
        const result = await resolveDlqEntries(supabase, rows, user, reason, 'resolved');
        return { success: true, action, ...result };
    }

    if (action === 'dlq_requeue') {
        const rows = await fetchDlqRowsForAction(supabase, input.id || null, true);
        const result = await requeueDlqEntries(supabase, rows, user, reason);
        return { success: true, action, ...result };
    }

    if (action === 'queue_retry_failed') {
        const rows = await fetchQueueRowsForAction(supabase, input.id || null);
        const result = await retryQueueRows(supabase, rows, user, reason);
        return { success: true, action, ...result };
    }

    if (action === 'queue_cancel_failed' || action === 'queue_clear_failed') {
        const rows = await fetchQueueRowsForAction(supabase, input.id || null);
        const result = await clearQueueRows(supabase, rows, user, reason, action === 'queue_cancel_failed' ? 'cancelled' : 'cleared');
        return { success: true, action, ...result };
    }

    if (action === 'delivery_retry' || action === 'delivery_retry_all') {
        const rows = await fetchDeliveryRowsForAction(supabase, input.id || null);
        const results = [];
        for (const row of rows) {
            if (!isActiveDeliveryStatus(row.operator_status)) {
                continue;
            }
            results.push(await retryDeliveryRow(supabase, row, user, reason));
        }
        return { success: true, action, retried: results.length, results };
    }

    if (action === 'delivery_mark_terminal') {
        const rows = await fetchDeliveryRowsForAction(supabase, input.id || null);
        const result = await markDeliveryTerminal(supabase, rows, user, reason);
        return { success: true, action, ...result };
    }

    if (action === 'event_retry') {
        const rows = await fetchEventRowsForAction(supabase, input.id || null);
        const result = await retryEventRows(supabase, rows, user, reason);
        return { success: true, action, ...result };
    }

    if (action === 'event_resolve') {
        const rows = await fetchEventRowsForAction(supabase, input.id || null);
        const result = await resolveEventRows(supabase, rows, user, reason);
        return { success: true, action, ...result };
    }

    if (action === 'alert_fix' || action === 'alert_retry') {
        const { data: alert, error } = await supabase
            .from('system_alerts')
            .select('*')
            .eq('id', input.id)
            .single();

        if (error || !alert) {
            throw new Error('Alert not found');
        }

        const remediation = inferAlertRemediation(alert);
        const mappedAction = action === 'alert_fix' ? remediation.fix_action : remediation.retry_action;
        const result = await runMappedAction(mappedAction, user, reason || alert.message);

        await insertControlAction(supabase, {
            category: 'alerts',
            target_type: 'system_alert',
            target_key: alert.id,
            operation: action,
            actor_id: toActorId(user),
            reason,
            source: 'shos',
            metadata: { mapped_action: mappedAction },
        });

        return { success: true, action, alert_id: alert.id, result };
    }

    if (action === 'alert_resolve') {
        const result = await resolveAlert(supabase, input.id, user, reason);
        return { success: true, action, ...result };
    }

    if (action === 'error_retry') {
        const sourceType = input.source_type;
        const tableName = sourceType === 'system_runtime_errors' ? 'system_runtime_errors' : 'system_errors';
        const { data: row, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', input.id)
            .single();

        if (error || !row) {
            throw new Error('Error record not found');
        }

        const sourceMapping = inferErrorSource(row, sourceType);
        const result = await runMappedAction(sourceMapping.retry_action, user, reason || (row.message || row.error_message || 'Retry error remediation'));

        await insertControlAction(supabase, {
            category: 'errors',
            target_type: tableName,
            target_key: row.id,
            operation: 'retry',
            actor_id: toActorId(user),
            reason,
            source: 'shos',
            metadata: { mapped_action: sourceMapping.retry_action },
        });

        return { success: true, action, id: row.id, result };
    }

    if (action === 'error_resolve') {
        const result = await resolveError(supabase, input.source_type, input.id, user, reason);
        return { success: true, action, ...result };
    }

    if (action === 'run_runbook') {
        const runbookResult = await executeRunbook(input.runbook);
        if (!runbookResult.success) {
            throw new Error(runbookResult.error || 'Runbook execution failed');
        }

        await insertControlAction(supabase, {
            category: 'runbooks',
            target_type: 'runbook',
            target_key: input.runbook,
            operation: 'execute',
            actor_id: toActorId(user),
            reason,
            source: 'shos',
        });

        return { success: true, action, runbook: input.runbook, result: runbookResult.result };
    }

    if (action === 'delivery_sync_pending') {
        const result = await syncPendingExternalDeliveries();
        return { success: true, action, result };
    }

    throw new Error(`Unknown SHOS action: ${action}`);
}

export { SAFE_ENABLE_QUEUE_FAILURE_THRESHOLD };