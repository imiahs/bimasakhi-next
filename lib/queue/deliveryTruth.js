import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getQStashClient } from '@/lib/queue/qstash';
import { safeLog } from '@/lib/safeLogger.js';

const QSTASH_ACTIVE_STATES = new Set(['ACTIVE', 'IN_PROGRESS', 'RETRY']);
const QSTASH_FAILURE_STATES = new Set(['FAILED', 'CANCELED']);

function isMissingTableError(error) {
    return error?.code === '42P01' || error?.message?.includes('does not exist');
}

function toIsoOrNull(value) {
    if (!value && value !== 0) return null;
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
    return new Date(timestamp).toISOString();
}

function parsePathFromUrl(targetUrl) {
    if (!targetUrl) return null;

    try {
        return new URL(targetUrl).pathname;
    } catch {
        return null;
    }
}

function resolveGenerationQueueId(explicitQueueId, requestPayload = {}) {
    return explicitQueueId
        || requestPayload.queueId
        || requestPayload.queue_id
        || requestPayload.generation_queue_id
        || null;
}

function resolveEventStoreId(explicitEventStoreId, requestPayload = {}) {
    return explicitEventStoreId
        || requestPayload._event_store_id
        || requestPayload.event_store_id
        || null;
}

function sortLogs(logs = []) {
    return [...logs].sort((left, right) => Number(left?.time || 0) - Number(right?.time || 0));
}

function buildErrorPayload(latestLog) {
    if (!latestLog?.error) return null;

    return {
        state: latestLog.state,
        error: latestLog.error,
        time: latestLog.time,
        nextDeliveryTime: latestLog.nextDeliveryTime || null,
        url: latestLog.url || null,
    };
}

function deriveDeliveryStatus(message, logs) {
    const latestLog = logs[logs.length - 1] || null;

    if (!message && !latestLog) {
        return 'unknown';
    }

    if (latestLog) {
        if (latestLog.state === 'DELIVERED') return 'delivered';
        if (latestLog.state === 'CANCELED') return 'cancelled';
        if (latestLog.state === 'FAILED') return 'failed';
        if (QSTASH_ACTIVE_STATES.has(latestLog.state)) return 'active';
        if (latestLog.state === 'ERROR') {
            return latestLog.nextDeliveryTime && latestLog.nextDeliveryTime > Date.now()
                ? 'active'
                : 'failed';
        }
    }

    if (message?.notBefore && Number(message.notBefore) > Date.now()) {
        return 'scheduled';
    }

    return 'published';
}

async function readExistingDeliveryRow(supabase, messageId) {
    const { data, error } = await supabase
        .from('external_delivery_logs')
        .select('*')
        .eq('provider_message_id', messageId)
        .maybeSingle();

    if (error) {
        if (isMissingTableError(error)) {
            return null;
        }

        throw error;
    }

    return data || null;
}

export async function recordExternalDelivery({
    messageId,
    source,
    eventName,
    eventStoreId,
    generationQueueId,
    targetUrl,
    targetPath,
    requestPayload = {},
    providerResponse = null,
}) {
    if (!messageId) {
        return null;
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
        return null;
    }

    const now = new Date().toISOString();
    const row = {
        provider: 'qstash',
        provider_message_id: messageId,
        status: 'published',
        source: source || 'unknown',
        event_name: eventName || requestPayload._event_name || null,
        event_store_id: resolveEventStoreId(eventStoreId, requestPayload),
        generation_queue_id: resolveGenerationQueueId(generationQueueId, requestPayload),
        target_url: targetUrl || null,
        target_path: targetPath || parsePathFromUrl(targetUrl),
        request_payload: requestPayload,
        provider_response: providerResponse,
        published_at: now,
        updated_at: now,
    };

    const { data, error } = await supabase
        .from('external_delivery_logs')
        .upsert(row, { onConflict: 'provider_message_id' })
        .select('*')
        .maybeSingle();

    if (error) {
        if (isMissingTableError(error)) {
            console.warn('[DeliveryTruth] external_delivery_logs table missing');
            return null;
        }

        throw error;
    }

    return data || null;
}

export async function syncExternalDelivery(messageId) {
    if (!messageId) {
        return { success: false, error: 'message_id_required' };
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
        return { success: false, error: 'supabase_unavailable' };
    }

    const qstashClient = getQStashClient();
    if (!qstashClient) {
        return { success: false, error: 'qstash_unavailable' };
    }

    let existing = null;
    try {
        existing = await readExistingDeliveryRow(supabase, messageId);
    } catch (error) {
        return { success: false, error: error.message };
    }

    const [messageResult, logsResult] = await Promise.allSettled([
        qstashClient.messages.get(messageId),
        qstashClient.logs({ messageIds: [messageId] }),
    ]);

    const message = messageResult.status === 'fulfilled' ? messageResult.value : null;
    const logs = sortLogs(logsResult.status === 'fulfilled' ? logsResult.value?.logs || [] : []);
    const latestLog = logs[logs.length - 1] || null;
    const syncErrors = [];

    if (messageResult.status === 'rejected') {
        syncErrors.push(`message:${messageResult.reason?.message || String(messageResult.reason)}`);
    }
    if (logsResult.status === 'rejected') {
        syncErrors.push(`logs:${logsResult.reason?.message || String(logsResult.reason)}`);
    }

    const status = deriveDeliveryStatus(message, logs);
    const deliveredLog = [...logs].reverse().find((log) => log.state === 'DELIVERED') || null;
    const failedLog = [...logs].reverse().find((log) => QSTASH_FAILURE_STATES.has(log.state) || (log.state === 'ERROR' && (!log.nextDeliveryTime || log.nextDeliveryTime <= Date.now()))) || null;
    const now = new Date().toISOString();

    const nextRow = {
        provider: 'qstash',
        provider_message_id: messageId,
        status,
        source: existing?.source || 'qstash_sync',
        event_name: existing?.event_name || null,
        event_store_id: existing?.event_store_id || null,
        generation_queue_id: existing?.generation_queue_id || null,
        target_url: message?.url || existing?.target_url || null,
        target_path: existing?.target_path || parsePathFromUrl(message?.url),
        request_payload: existing?.request_payload || {},
        provider_response: existing?.provider_response || null,
        provider_message: message,
        latest_event: latestLog,
        attempt_history: logs,
        attempt_count: logs.length,
        provider_retry_count: logs.filter((log) => log.state === 'RETRY').length,
        sync_count: (existing?.sync_count || 0) + 1,
        error_payload: buildErrorPayload(latestLog),
        sync_error: syncErrors.length > 0 ? syncErrors.join('; ') : null,
        first_provider_event_at: toIsoOrNull(logs[0]?.time) || existing?.first_provider_event_at || null,
        last_provider_event_at: toIsoOrNull(latestLog?.time) || existing?.last_provider_event_at || null,
        delivered_at: toIsoOrNull(deliveredLog?.time) || existing?.delivered_at || null,
        failed_at: toIsoOrNull(failedLog?.time) || existing?.failed_at || null,
        last_sync_at: now,
        updated_at: now,
        published_at: existing?.published_at || toIsoOrNull(message?.createdAt) || now,
    };

    const query = existing
        ? supabase.from('external_delivery_logs').update(nextRow).eq('provider_message_id', messageId)
        : supabase.from('external_delivery_logs').insert(nextRow);

    const { error } = await query;

    if (error) {
        if (isMissingTableError(error)) {
            return { success: false, error: 'delivery_table_missing' };
        }

        throw error;
    }

    if (status === 'failed' || status === 'cancelled') {
        await safeLog('QSTASH_DELIVERY_FAILURE', `QStash delivery ${status}`, {
            messageId,
            event_store_id: nextRow.event_store_id,
            generation_queue_id: nextRow.generation_queue_id,
            latest_event: latestLog,
        });
    }

    return {
        success: true,
        message_id: messageId,
        status,
        attempt_count: nextRow.attempt_count,
        provider_retry_count: nextRow.provider_retry_count,
        delivered_at: nextRow.delivered_at,
        failed_at: nextRow.failed_at,
        sync_error: nextRow.sync_error,
    };
}

export async function syncPendingExternalDeliveries({ limit = 25, staleMinutes = 2 } = {}) {
    const supabase = getServiceSupabase();
    if (!supabase) {
        return { success: false, error: 'supabase_unavailable' };
    }

    const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('external_delivery_logs')
        .select('provider_message_id, status, published_at, last_sync_at')
        .in('status', ['published', 'scheduled', 'active', 'unknown'])
        .or(`last_sync_at.is.null,last_sync_at.lt.${staleCutoff}`)
        .order('published_at', { ascending: true })
        .limit(limit);

    if (error) {
        if (isMissingTableError(error)) {
            return { success: false, error: 'delivery_table_missing' };
        }

        throw error;
    }

    const results = {
        success: true,
        scanned: data?.length || 0,
        synced: 0,
        delivered: 0,
        failed: 0,
        active: 0,
        errors: [],
    };

    for (const row of data || []) {
        try {
            const syncResult = await syncExternalDelivery(row.provider_message_id);
            if (!syncResult?.success) {
                results.errors.push({ message_id: row.provider_message_id, error: syncResult?.error || 'sync_failed' });
                continue;
            }

            results.synced += 1;
            if (syncResult.status === 'delivered') {
                results.delivered += 1;
            } else if (syncResult.status === 'failed' || syncResult.status === 'cancelled') {
                results.failed += 1;
            } else {
                results.active += 1;
            }
        } catch (error_) {
            results.errors.push({ message_id: row.provider_message_id, error: error_.message });
        }
    }

    return results;
}

export async function getDeliveryHealthMetrics({ recentHours = 24, stuckMinutes = 15 } = {}) {
    const supabase = getServiceSupabase();
    if (!supabase) {
        return {
            delivery_failures_recent: 0,
            delivery_stuck_count: 0,
            delivery_success_rate: 100,
            delivery_terminal_recent: 0,
        };
    }

    const recentCutoff = new Date(Date.now() - recentHours * 60 * 60 * 1000).toISOString();
    const stuckCutoff = new Date(Date.now() - stuckMinutes * 60 * 1000).toISOString();

    const [
        recentFailedResult,
        recentDeliveredResult,
        recentTerminalResult,
        stuckResult,
    ] = await Promise.all([
        supabase.from('external_delivery_logs')
            .select('*', { count: 'exact', head: true })
            .in('status', ['failed', 'cancelled'])
            .or(`failed_at.gte.${recentCutoff},last_provider_event_at.gte.${recentCutoff},published_at.gte.${recentCutoff}`),
        supabase.from('external_delivery_logs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'delivered')
            .or(`delivered_at.gte.${recentCutoff},last_provider_event_at.gte.${recentCutoff},published_at.gte.${recentCutoff}`),
        supabase.from('external_delivery_logs')
            .select('*', { count: 'exact', head: true })
            .in('status', ['delivered', 'failed', 'cancelled'])
            .or(`delivered_at.gte.${recentCutoff},failed_at.gte.${recentCutoff},last_provider_event_at.gte.${recentCutoff},published_at.gte.${recentCutoff}`),
        supabase.from('external_delivery_logs')
            .select('*', { count: 'exact', head: true })
            .in('status', ['published', 'scheduled', 'active', 'unknown'])
            .lt('published_at', stuckCutoff),
    ]);

    const recentFailures = recentFailedResult.count || 0;
    const recentDelivered = recentDeliveredResult.count || 0;
    const recentTerminal = recentTerminalResult.count || 0;
    const stuckCount = stuckResult.count || 0;
    const successRate = recentTerminal > 0
        ? Number(((recentDelivered / recentTerminal) * 100).toFixed(2))
        : 100;

    return {
        delivery_failures_recent: recentFailures,
        delivery_stuck_count: stuckCount,
        delivery_success_rate: successRate,
        delivery_terminal_recent: recentTerminal,
        delivery_delivered_recent: recentDelivered,
    };
}