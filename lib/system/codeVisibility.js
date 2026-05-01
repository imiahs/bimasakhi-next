import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getSystemConfig } from '@/lib/systemConfig';
import { getSystemMode } from '@/lib/system/systemModes';
import { getStuckEvents } from '@/lib/events/eventStore';
import { getDeliveryHealthMetrics } from '@/lib/queue/deliveryTruth';

const DAY_MS = 24 * 60 * 60 * 1000;

const CONTROL_ROW_DEFAULTS = Object.freeze({
    system_mode: 'normal',
    safe_mode: false,
    ai_enabled: false,
    queue_paused: true,
    crm_auto_routing: false,
    followup_enabled: false,
    pagegen_enabled: true,
    bulk_generation_enabled: true,
    batch_size: 5,
    updated_at: null,
});

const MODULE_DEFINITIONS = Object.freeze({
    control_plane: {
        label: 'Control Plane',
        description: 'Runtime switches and system mode deciding what can run.',
        control_links: ['/admin/settings', '/admin/control/features', '/admin/control/workflow'],
        code_anchors: [
            { path: 'lib/systemConfig.js', purpose: 'Runtime control flags' },
            { path: 'lib/system/systemModes.js', purpose: 'System mode resolution' },
            { path: 'app/admin/settings/page.js', purpose: 'Live control UI' },
        ],
    },
    generation_engine: {
        label: 'Generation Engine',
        description: 'Page generation queue and bulk execution lane.',
        control_links: ['/admin/ai', '/admin/ccc/bulk', '/admin/settings'],
        code_anchors: [
            { path: 'app/api/jobs/pagegen/route.js', purpose: 'Page generation worker' },
            { path: 'app/api/admin/ccc/bulk/route.js', purpose: 'Bulk planning API' },
            { path: 'lib/queue/publisher.js', purpose: 'Queue publish path' },
        ],
    },
    event_bus: {
        label: 'Event Bus',
        description: 'Durable event store and execution acknowledgements.',
        control_links: ['/admin/system/observability', '/admin/system/health'],
        code_anchors: [
            { path: 'lib/events/eventStore.js', purpose: 'Event durability and ACK state' },
            { path: 'app/api/events/route.js', purpose: 'Primary event ingress' },
            { path: 'app/api/jobs/event-retry/route.js', purpose: 'Retry daemon' },
        ],
    },
    delivery_engine: {
        label: 'Delivery Engine',
        description: 'External delivery truth for QStash-backed execution.',
        control_links: ['/admin/system/health'],
        code_anchors: [
            { path: 'lib/queue/deliveryTruth.js', purpose: 'Delivery truth ledger and metrics' },
            { path: 'app/api/admin/delivery-logs/route.js', purpose: 'Admin delivery truth API' },
            { path: 'app/api/jobs/delivery-sync/route.js', purpose: 'Delivery sync worker' },
        ],
    },
    crm_followup: {
        label: 'CRM / Follow-up',
        description: 'Lead routing, sync backlog, and follow-up execution.',
        control_links: ['/admin/crm', '/admin/failed', '/admin/settings'],
        code_anchors: [
            { path: 'pages/api/crm/[action].js', purpose: 'Lead ingress and CRM guard' },
            { path: 'app/api/workers/lead-sync/route.js', purpose: 'Lead sync worker' },
            { path: 'app/api/jobs/followup-trigger/route.js', purpose: 'Follow-up worker gate' },
        ],
    },
    recovery_crons: {
        label: 'Recovery / Cron Engine',
        description: 'Retry, reconciliation, and vendor health recovery loops.',
        control_links: ['/admin/system/health', '/admin/system/dlq'],
        code_anchors: [
            { path: 'app/api/jobs/event-retry/route.js', purpose: 'Retry daemon' },
            { path: 'app/api/jobs/reconciliation/route.js', purpose: 'Reconciliation loop' },
            { path: 'app/api/jobs/vendor-health-check/route.js', purpose: 'Vendor health loop' },
        ],
    },
});

function buildModule(moduleId, state, reason, metrics, extras = {}) {
    const definition = MODULE_DEFINITIONS[moduleId];

    return {
        id: moduleId,
        label: definition.label,
        description: definition.description,
        state,
        reason,
        metrics,
        control_links: definition.control_links,
        code_anchors: definition.code_anchors,
        ...extras,
    };
}

function recentIso(days = 1) {
    return new Date(Date.now() - days * DAY_MS).toISOString();
}

function minutesAgoIso(minutes) {
    return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function countRows(result) {
    return result?.count || 0;
}

function countByStatus(rows = []) {
    return rows.reduce((summary, row) => {
        const status = row?.status || 'unknown';
        summary[status] = (summary[status] || 0) + 1;
        return summary;
    }, {});
}

function summarizeOverall(modules) {
    const counts = modules.reduce((summary, module) => {
        summary[module.state] = (summary[module.state] || 0) + 1;
        return summary;
    }, { active: 0, idle: 0, paused: 0, degraded: 0, failing: 0 });

    let state = 'idle';
    let reason = 'No active module work is running.';

    if (counts.failing > 0) {
        state = 'failing';
        reason = `${counts.failing} module(s) are failing.`;
    } else if (counts.degraded > 0) {
        state = 'degraded';
        reason = `${counts.degraded} module(s) are degraded.`;
    } else if (counts.active > 0) {
        state = 'active';
        reason = `${counts.active} module(s) are actively executing.`;
    } else if (counts.paused > 0) {
        state = 'paused';
        reason = `${counts.paused} module(s) are intentionally paused.`;
    }

    return {
        state,
        reason,
        counts,
    };
}

function buildFlows(modules) {
    const moduleMap = Object.fromEntries(modules.map((module) => [module.id, module]));

    const flowDefinitions = [
        {
            id: 'queue_dispatch',
            label: 'Queue Dispatch',
            moduleId: 'generation_engine',
            description: 'Bulk and page generation jobs entering execution.',
        },
        {
            id: 'event_execution',
            label: 'Event Execution',
            moduleId: 'event_bus',
            description: 'Durable events moving from pending to ACK.',
        },
        {
            id: 'external_delivery',
            label: 'External Delivery',
            moduleId: 'delivery_engine',
            description: 'QStash-backed delivery and retry truth.',
        },
        {
            id: 'crm_routing_followup',
            label: 'CRM Routing + Follow-up',
            moduleId: 'crm_followup',
            description: 'Lead routing, sync, and follow-up execution path.',
        },
        {
            id: 'recovery_loops',
            label: 'Recovery Loops',
            moduleId: 'recovery_crons',
            description: 'Retry, reconciliation, and health-recovery loops.',
        },
    ];

    return flowDefinitions
        .filter((flow) => moduleMap[flow.moduleId])
        .map((flow) => {
        const owner = moduleMap[flow.moduleId];
        return {
            id: flow.id,
            label: flow.label,
            description: flow.description,
            owner_module_id: flow.moduleId,
            state: owner.state,
            reason: owner.reason,
            control_links: owner.control_links,
            code_anchors: owner.code_anchors,
        };
        });
}

function buildCronStatus(lastRunAt, healthyWithinMinutes, staleWithinMinutes) {
    if (!lastRunAt) {
        return {
            status: 'dead',
            age_minutes: null,
            last_run: null,
        };
    }

    const ageMinutes = Math.round((Date.now() - new Date(lastRunAt).getTime()) / 60000);
    let status = 'dead';

    if (ageMinutes <= healthyWithinMinutes) {
        status = 'healthy';
    } else if (ageMinutes <= staleWithinMinutes) {
        status = 'stale';
    }

    return {
        status,
        age_minutes: ageMinutes,
        last_run: lastRunAt,
    };
}

async function readControlRow(supabase) {
    const { data, error } = await supabase
        .from('system_control_config')
        .select('system_mode, safe_mode, ai_enabled, queue_paused, crm_auto_routing, followup_enabled, pagegen_enabled, bulk_generation_enabled, batch_size, updated_at')
        .eq('singleton_key', true)
        .single();

    if (error || !data) {
        return { ...CONTROL_ROW_DEFAULTS };
    }

    return {
        ...CONTROL_ROW_DEFAULTS,
        ...data,
    };
}

async function readControlPlaneModule(supabase) {
    const [controlRow, config, systemMode] = await Promise.all([
        readControlRow(supabase),
        getSystemConfig(),
        getSystemMode(),
    ]);

    let state = 'active';
    let reason = 'Runtime controls are loaded from system_control_config.';

    if (controlRow.safe_mode) {
        state = 'paused';
        reason = 'safe_mode is ON. Automated execution is intentionally paused.';
    } else if (systemMode !== 'normal') {
        state = 'degraded';
        reason = `system_mode is ${systemMode}. Runtime is intentionally constrained.`;
    }

    return buildModule('control_plane', state, reason, {
        system_mode: systemMode,
        safe_mode: controlRow.safe_mode,
        ai_enabled: config.ai_enabled,
        queue_paused: config.queue_paused,
        crm_auto_routing: config.crm_auto_routing,
        followup_enabled: config.followup_enabled,
        pagegen_enabled: controlRow.pagegen_enabled,
        bulk_generation_enabled: controlRow.bulk_generation_enabled,
        batch_size: controlRow.batch_size,
        updated_at: controlRow.updated_at,
    });
}

async function readGenerationEngineModule(supabase) {
    const controlRow = await readControlRow(supabase);
    const [pendingResult, processingResult, failedResult] = await Promise.all([
        supabase.from('generation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('generation_queue').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
        supabase.from('generation_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    ]);

    const pending = countRows(pendingResult);
    const processing = countRows(processingResult);
    const failed = countRows(failedResult);

    let state = 'idle';
    let reason = 'Generation controls are enabled and no queue work is active.';

    if (controlRow.safe_mode) {
        state = 'paused';
        reason = 'safe_mode is ON. Generation is intentionally paused.';
    } else if (controlRow.queue_paused) {
        state = 'paused';
        reason = 'queue_paused is ON. Generation dispatch is blocked.';
    } else if (controlRow.pagegen_enabled === false) {
        state = 'paused';
        reason = 'pagegen_enabled is OFF. Page generation is blocked at the control plane.';
    } else if (failed > 0) {
        state = 'degraded';
        reason = `${failed} generation queue item(s) are failed and need review.`;
    } else if (pending + processing > 0) {
        state = 'active';
        reason = `${pending + processing} generation item(s) are currently queued or processing.`;
    } else if (controlRow.bulk_generation_enabled === false) {
        reason = 'Page generation is enabled, but bulk generation is currently disabled and idle.';
    }

    return buildModule('generation_engine', state, reason, {
        pagegen_enabled: controlRow.pagegen_enabled,
        bulk_generation_enabled: controlRow.bulk_generation_enabled,
        queue_paused: controlRow.queue_paused,
        batch_size: controlRow.batch_size,
        queue_pending: pending,
        queue_processing: processing,
        queue_failed: failed,
    });
}

async function readEventBusModule(supabase) {
    const failedSince = recentIso();
    const [pendingResult, dispatchedResult, failedResult, stuckEvents] = await Promise.all([
        supabase.from('event_store').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('event_store').select('*', { count: 'exact', head: true }).eq('status', 'dispatched'),
        supabase.from('event_store').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', failedSince),
        getStuckEvents(15, 5),
    ]);

    const pending = countRows(pendingResult);
    const dispatched = countRows(dispatchedResult);
    const failedRecent = countRows(failedResult);
    const stuckCount = stuckEvents.length;

    let state = 'idle';
    let reason = 'No pending or dispatched events are waiting for execution.';

    if (stuckCount > 0) {
        state = 'failing';
        reason = `${stuckCount} dispatched event(s) are stuck without completion ACK.`;
    } else if (failedRecent > 0) {
        state = 'degraded';
        reason = `${failedRecent} event(s) failed in the last 24 hours.`;
    } else if (pending + dispatched > 0) {
        state = 'active';
        reason = `${pending + dispatched} event(s) are pending or dispatched right now.`;
    }

    return buildModule('event_bus', state, reason, {
        pending_events: pending,
        dispatched_events: dispatched,
        failed_events_24h: failedRecent,
        stuck_events: stuckCount,
        stuck_event_ids: stuckEvents.map((event) => event.id),
    });
}

async function readDeliveryEngineModule(supabase) {
    const [metrics, recentRowsResult] = await Promise.all([
        getDeliveryHealthMetrics(),
        supabase
            .from('external_delivery_logs')
            .select('status, event_name, target_path, published_at, failed_at')
            .order('published_at', { ascending: false })
            .limit(3),
    ]);

    let state = 'idle';
    let reason = 'No recent delivery activity is in the current health window.';

    if (metrics.delivery_failures_recent > 0) {
        state = 'failing';
        reason = `${metrics.delivery_failures_recent} delivery failure(s) exist in the current health window.`;
    } else if (metrics.delivery_stuck_count > 0) {
        state = 'degraded';
        reason = `${metrics.delivery_stuck_count} delivery item(s) are stuck.`;
    } else if (metrics.delivery_terminal_recent > 0) {
        state = 'active';
        reason = `${metrics.delivery_terminal_recent} delivery item(s) reached a terminal state in the current window.`;
    }

    return buildModule('delivery_engine', state, reason, {
        delivery_failures_recent: metrics.delivery_failures_recent,
        delivery_stuck_count: metrics.delivery_stuck_count,
        delivery_success_rate: metrics.delivery_success_rate,
        delivery_terminal_recent: metrics.delivery_terminal_recent,
        delivery_delivered_recent: metrics.delivery_delivered_recent,
        recent_items: (recentRowsResult.data || []).map((row) => ({
            status: row.status,
            event_name: row.event_name,
            target_path: row.target_path,
            published_at: row.published_at,
            failed_at: row.failed_at,
        })),
    });
}

async function readCrmFollowupModule(supabase) {
    const controlRow = await readControlRow(supabase);
    const since = recentIso();

    const [leads24hResult, syncPendingResult, retryPendingResult, followupSuccessResult, followupFailureResult] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', since),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('sync_status', 'pending'),
        supabase.from('failed_leads').select('*', { count: 'exact', head: true }).lt('retry_count', 3),
        supabase.from('observability_logs').select('*', { count: 'exact', head: true }).eq('source', 'followup-trigger').eq('level', 'FOLLOWUP_SUCCESS').gte('created_at', since),
        supabase.from('observability_logs').select('*', { count: 'exact', head: true }).eq('source', 'followup-trigger').eq('level', 'FOLLOWUP_FAILURE').gte('created_at', since),
    ]);

    const leads24h = countRows(leads24hResult);
    const syncPending = countRows(syncPendingResult);
    const retryPending = countRows(retryPendingResult);
    const followupSuccess24h = countRows(followupSuccessResult);
    const followupFailure24h = countRows(followupFailureResult);

    let state = 'idle';
    let reason = 'CRM routing and follow-up are enabled, but no recent work is active.';

    if (controlRow.safe_mode) {
        state = 'paused';
        reason = 'safe_mode is ON. CRM routing and follow-up are intentionally paused.';
    } else if (!controlRow.crm_auto_routing && !controlRow.followup_enabled) {
        state = 'paused';
        reason = 'crm_auto_routing and followup_enabled are both OFF.';
    } else if (retryPending > 0 || followupFailure24h > 0) {
        state = 'degraded';
        reason = `${retryPending} retryable failed lead(s) and ${followupFailure24h} follow-up failure event(s) need review.`;
    } else if (leads24h > 0 || syncPending > 0 || followupSuccess24h > 0) {
        state = 'active';
        reason = 'Lead routing or follow-up work is active in the current window.';
    }

    return buildModule('crm_followup', state, reason, {
        crm_auto_routing: controlRow.crm_auto_routing,
        followup_enabled: controlRow.followup_enabled,
        leads_24h: leads24h,
        sync_pending: syncPending,
        failed_retry_pending: retryPending,
        followup_success_24h: followupSuccess24h,
        followup_failure_24h: followupFailure24h,
    });
}

async function readRecoveryCronsModule(supabase) {
    const [eventRetryLastResult, vendorHealthLastResult, reconciliationLastResult, deadLettersResult] = await Promise.all([
        supabase.from('observability_logs').select('created_at').eq('level', 'RETRY_DAEMON_RUN').order('created_at', { ascending: false }).limit(1),
        supabase.from('observability_logs').select('created_at').eq('source', 'vendor_health_check').order('created_at', { ascending: false }).limit(1),
        supabase.from('observability_logs').select('created_at').in('level', ['RECONCILIATION_CLEAN', 'RECONCILIATION_ISSUES_FOUND']).order('created_at', { ascending: false }).limit(1),
        supabase.from('job_dead_letters').select('*', { count: 'exact', head: true }),
    ]);

    const eventRetry = buildCronStatus(eventRetryLastResult.data?.[0]?.created_at || null, 10, 20);
    const vendorHealth = buildCronStatus(vendorHealthLastResult.data?.[0]?.created_at || null, 10, 20);
    const reconciliation = buildCronStatus(reconciliationLastResult.data?.[0]?.created_at || null, 35, 90);
    const deadLetters = countRows(deadLettersResult);
    const cronStates = [eventRetry.status, vendorHealth.status, reconciliation.status];

    let state = 'idle';
    let reason = 'No active recovery pressure is visible right now.';

    if (deadLetters > 0 || cronStates.includes('dead')) {
        state = 'failing';
        reason = 'Dead letters exist or a required recovery cron has gone dead.';
    } else if (cronStates.includes('stale')) {
        state = 'degraded';
        reason = 'At least one required recovery cron is stale.';
    } else if (cronStates.includes('healthy')) {
        state = 'active';
        reason = 'Recovery crons are running inside their expected freshness window.';
    }

    return buildModule('recovery_crons', state, reason, {
        dead_letters: deadLetters,
        event_retry: eventRetry,
        vendor_health_check: vendorHealth,
        reconciliation,
    });
}

async function readModule(moduleId, reader, supabase) {
    try {
        return await reader(supabase);
    } catch (error) {
        return buildModule(moduleId, 'failing', `Visibility source failed: ${error.message}`, {
            error: error.message,
        });
    }
}

export const CODE_VISIBILITY_MODULE_IDS = Object.keys(MODULE_DEFINITIONS);

export async function getCodeVisibilitySnapshot(requestedModuleId = null) {
    if (requestedModuleId && !MODULE_DEFINITIONS[requestedModuleId]) {
        return {
            success: false,
            error: `unknown_module:${requestedModuleId}`,
        };
    }

    const supabase = getServiceSupabase();
    const modules = await Promise.all([
        readModule('control_plane', readControlPlaneModule, supabase),
        readModule('generation_engine', readGenerationEngineModule, supabase),
        readModule('event_bus', readEventBusModule, supabase),
        readModule('delivery_engine', readDeliveryEngineModule, supabase),
        readModule('crm_followup', readCrmFollowupModule, supabase),
        readModule('recovery_crons', readRecoveryCronsModule, supabase),
    ]);

    const filteredModules = requestedModuleId
        ? modules.filter((module) => module.id === requestedModuleId)
        : modules;

    return {
        success: true,
        captured_at: new Date().toISOString(),
        overall: summarizeOverall(filteredModules),
        modules: filteredModules,
        flows: buildFlows(filteredModules),
    };
}