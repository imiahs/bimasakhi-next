import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Client as QStashClient } from '@upstash/qstash';
import {
  RESULTS_DIR,
  adminLoginPayload,
  canonicalBaseUrl,
  getServiceSupabase,
  loadEnv,
} from './_auditUtils.mjs';
import fs from 'node:fs';
import path from 'node:path';

loadEnv();

const baseUrl = canonicalBaseUrl();
const supabase = getServiceSupabase();
const qstash = new QStashClient({ token: process.env.QSTASH_TOKEN });
const auditSource = 'audit_c26_zero_trust';
const auditMarker = `ZERO_TRUST_C26_${Date.now()}`;
const startedAt = new Date().toISOString();

function randomDigits(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

function toIsoOrNull(value) {
  if (!value && value !== 0) return null;
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp).toISOString();
}

function sortLogs(logs = []) {
  return [...logs].sort((left, right) => Number(left?.time || 0) - Number(right?.time || 0));
}

function deriveDeliveryStatus(message, logs) {
  const latestLog = logs[logs.length - 1] || null;

  if (!message && !latestLog) return 'unknown';

  if (latestLog) {
    if (latestLog.state === 'DELIVERED') return 'delivered';
    if (latestLog.state === 'FAILED') return 'failed';
    if (latestLog.state === 'CANCELED') return 'cancelled';
    if (latestLog.state === 'ACTIVE' || latestLog.state === 'IN_PROGRESS' || latestLog.state === 'RETRY') return 'active';
    if (latestLog.state === 'ERROR') {
      return latestLog.nextDeliveryTime && latestLog.nextDeliveryTime > Date.now() ? 'active' : 'failed';
    }
  }

  if (message?.notBefore && Number(message.notBefore) > Date.now()) return 'scheduled';
  return 'published';
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

function cookieFromSetCookie(setCookie) {
  if (!setCookie) return '';

  return String(setCookie)
    .split(/,(?=[^;=]+=[^;]+)/)
    .map((part) => part.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

async function fetchJson(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function adminLogin() {
  const login = await fetchJson(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: baseUrl,
    },
    body: JSON.stringify(adminLoginPayload()),
  }, 30000);

  return {
    ...login,
    cookie: cookieFromSetCookie(login.headers['set-cookie']),
  };
}

async function adminGet(cookie, pathName) {
  return fetchJson(`${baseUrl}${pathName}`, {
    headers: {
      Cookie: cookie,
    },
  }, 60000);
}

async function insertGenerationQueue(row) {
  const { data, error } = await supabase
    .from('generation_queue')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function insertEventStore(row) {
  const { data, error } = await supabase
    .from('event_store')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function insertContactInquiry(row) {
  const { data, error } = await supabase
    .from('contact_inquiries')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function deleteRowsByIds(table, ids) {
  if (!ids.length) return;
  const { error } = await supabase.from(table).delete().in('id', ids);
  if (error) throw error;
}

async function markDispatched(eventStoreId, messageId) {
  const { error } = await supabase
    .from('event_store')
    .update({
      status: 'dispatched',
      dispatch_message_id: messageId,
      dispatched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventStoreId);

  if (error) throw error;
}

async function recordExternalDelivery({
  messageId,
  source,
  eventName,
  eventStoreId,
  generationQueueId,
  targetUrl,
  targetPath,
  requestPayload,
  providerResponse,
}) {
  const now = new Date().toISOString();
  const row = {
    provider: 'qstash',
    provider_message_id: messageId,
    status: 'published',
    source,
    event_name: eventName,
    event_store_id: eventStoreId,
    generation_queue_id: generationQueueId,
    target_url: targetUrl,
    target_path: targetPath,
    request_payload: requestPayload,
    provider_response: providerResponse,
    published_at: now,
    updated_at: now,
  };

  const { error } = await supabase
    .from('external_delivery_logs')
    .upsert(row, { onConflict: 'provider_message_id' });

  if (error) throw error;
}

async function readDeliveryRow(messageId) {
  const { data, error } = await supabase
    .from('external_delivery_logs')
    .select('*')
    .eq('provider_message_id', messageId)
    .single();

  if (error) throw error;
  return data;
}

async function readEventStoreRow(eventStoreId) {
  const { data, error } = await supabase
    .from('event_store')
    .select('*')
    .eq('id', eventStoreId)
    .single();

  if (error) throw error;
  return data;
}

async function getQStashSnapshot(messageId) {
  const [messageResult, logsResult] = await Promise.allSettled([
    qstash.messages.get(messageId),
    qstash.logs({ messageIds: [messageId] }),
  ]);

  return {
    message: messageResult.status === 'fulfilled' ? messageResult.value : null,
    message_error: messageResult.status === 'rejected' ? messageResult.reason?.message || String(messageResult.reason) : null,
    logs: logsResult.status === 'fulfilled' ? sortLogs(logsResult.value?.logs || []) : [],
    logs_error: logsResult.status === 'rejected' ? logsResult.reason?.message || String(logsResult.reason) : null,
  };
}

async function syncExternalDelivery(messageId) {
  const existing = await readDeliveryRow(messageId);
  const snapshot = await getQStashSnapshot(messageId);
  const logs = snapshot.logs;
  const latestLog = logs[logs.length - 1] || null;
  const message = snapshot.message;
  const status = deriveDeliveryStatus(message, logs);
  const deliveredLog = [...logs].reverse().find((log) => log.state === 'DELIVERED') || null;
  const failedLog = [...logs].reverse().find((log) => log.state === 'FAILED' || log.state === 'CANCELED' || (log.state === 'ERROR' && (!log.nextDeliveryTime || log.nextDeliveryTime <= Date.now()))) || null;

  const row = {
    provider_message: message,
    latest_event: latestLog,
    attempt_history: logs,
    attempt_count: logs.length,
    provider_retry_count: logs.filter((log) => log.state === 'RETRY').length,
    sync_count: (existing.sync_count || 0) + 1,
    error_payload: buildErrorPayload(latestLog),
    sync_error: [snapshot.message_error ? `message:${snapshot.message_error}` : null, snapshot.logs_error ? `logs:${snapshot.logs_error}` : null].filter(Boolean).join('; ') || null,
    first_provider_event_at: toIsoOrNull(logs[0]?.time) || existing.first_provider_event_at || null,
    last_provider_event_at: toIsoOrNull(latestLog?.time) || existing.last_provider_event_at || null,
    delivered_at: toIsoOrNull(deliveredLog?.time) || existing.delivered_at || null,
    failed_at: toIsoOrNull(failedLog?.time) || existing.failed_at || null,
    last_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status,
  };

  const { error } = await supabase
    .from('external_delivery_logs')
    .update(row)
    .eq('provider_message_id', messageId);

  if (error) throw error;

  return {
    delivery: await readDeliveryRow(messageId),
    provider: snapshot,
  };
}

async function waitForTerminalStatus(messageId, acceptedStatuses, timeoutMs = 120000, intervalMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;

  while (Date.now() < deadline) {
    last = await syncExternalDelivery(messageId);
    if (acceptedStatuses.includes(last.delivery.status)) {
      return last;
    }
    await delay(intervalMs);
  }

  return last;
}

async function waitForDelivery(messageId, timeoutMs = 90000, intervalMs = 3000) {
  return waitForTerminalStatus(messageId, ['delivered'], timeoutMs, intervalMs);
}

async function waitForFailedDelivery(messageId, timeoutMs = 120000, intervalMs = 4000) {
  return waitForTerminalStatus(messageId, ['failed'], timeoutMs, intervalMs);
}

async function createSuccessDispatch(index) {
  const queue = await insertGenerationQueue({
    task_type: 'pagegen',
    payload: {
      pages: [
        {
          slug: `${auditMarker.toLowerCase()}-success-${index}`,
          keyword_text: `${auditMarker} success ${index}`,
        },
      ],
    },
    status: 'completed',
    progress: 1,
    total_items: 1,
    retry_count: 0,
    max_retries: 1,
    completed_at: new Date().toISOString(),
    priority: 1,
    created_by: auditSource,
  });

  const contact = await insertContactInquiry({
    contact_id: `${auditMarker}_CONTACT_${index}_${crypto.randomUUID()}`,
    name: `${auditMarker} Contact ${index}`,
    mobile: `9${randomDigits(9)}`,
    email: `${auditMarker.toLowerCase()}_${index}_${randomDigits(4)}@example.com`,
    reason: 'cto_zero_trust_c26',
    message: `${auditMarker} delivered proof ${index}`,
    source: auditSource,
    pipeline: 'audit',
    tag: auditMarker,
    sync_status: 'pending',
  });

  const correlationId = `${auditMarker}_success_${index}_${crypto.randomUUID()}`;
  const event = await insertEventStore({
    event_name: 'contact_created',
    payload: {
      contactId: contact.contact_id,
      queueId: queue.id,
      audit_marker: auditMarker,
      proof_index: index,
    },
    source: auditSource,
    status: 'pending',
    priority: 'critical',
    retry_count: 0,
    max_retries: 1,
    execution_context: {
      audit: 'c26_zero_trust',
      correlation_id: correlationId,
      event_id: correlationId,
    },
    correlation_id: correlationId,
  });

  const body = {
    queueId: queue.id,
    contactId: contact.contact_id,
    audit_marker: auditMarker,
    _execution_context: {
      audit: 'c26_zero_trust',
      correlation_id: correlationId,
      event_id: correlationId,
    },
    _event_name: 'contact_created',
    _executive: 'coo',
    _event_store_id: event.id,
  };

  const targetPath = '/api/workers/contact-sync';
  const targetUrl = `${baseUrl}${targetPath}`;
  const response = await qstash.publishJSON({
    url: targetUrl,
    body,
    retries: 0,
  });

  await markDispatched(event.id, response.messageId);
  await recordExternalDelivery({
    messageId: response.messageId,
    source: auditSource,
    eventName: 'contact_created',
    eventStoreId: event.id,
    generationQueueId: queue.id,
    targetUrl,
    targetPath,
    requestPayload: body,
    providerResponse: response,
  });

  const settled = await waitForDelivery(response.messageId);

  return {
    event,
    queue,
    contact,
    delivery: settled.delivery,
    provider: settled.provider,
  };
}

async function createFailureDispatch(index, retries) {
  const queue = await insertGenerationQueue({
    task_type: 'pagegen',
    payload: {
      pages: [
        {
          slug: `${auditMarker.toLowerCase()}-failure-${index}`,
          keyword_text: `${auditMarker} failure ${index}`,
        },
      ],
    },
    status: 'completed',
    progress: 1,
    total_items: 1,
    retry_count: 0,
    max_retries: 1,
    completed_at: new Date().toISOString(),
    priority: 1,
    created_by: auditSource,
  });

  const leadId = `00000000-0000-0000-0000-${randomDigits(12)}`;
  const correlationId = `${auditMarker}_failure_${index}_${crypto.randomUUID()}`;
  const event = await insertEventStore({
    event_name: 'lead_hot',
    payload: {
      leadId,
      queueId: queue.id,
      audit_marker: auditMarker,
      proof_index: index,
    },
    source: auditSource,
    status: 'pending',
    priority: 'critical',
    retry_count: 0,
    max_retries: 0,
    execution_context: {
      audit: 'c26_zero_trust',
      correlation_id: correlationId,
      event_id: correlationId,
    },
    correlation_id: correlationId,
  });

  const body = {
    leadId,
    queueId: queue.id,
    audit_marker: auditMarker,
    _execution_context: {
      audit: 'c26_zero_trust',
      correlation_id: correlationId,
      event_id: correlationId,
    },
    _event_name: 'lead_hot',
    _executive: 'cso',
    _event_store_id: event.id,
  };

  const targetPath = '/api/jobs/followup-trigger';
  const targetUrl = `${baseUrl}${targetPath}`;
  const response = await qstash.publishJSON({
    url: targetUrl,
    body,
    retries,
  });

  await markDispatched(event.id, response.messageId);
  await recordExternalDelivery({
    messageId: response.messageId,
    source: auditSource,
    eventName: 'lead_hot',
    eventStoreId: event.id,
    generationQueueId: queue.id,
    targetUrl,
    targetPath,
    requestPayload: body,
    providerResponse: response,
  });

  const settled = await waitForFailedDelivery(response.messageId);

  return {
    event,
    queue,
    lead_id: leadId,
    delivery: settled.delivery,
    provider: settled.provider,
  };
}

async function latestRows() {
  const { data, error } = await supabase
    .from('external_delivery_logs')
    .select('*')
    .eq('source', auditSource)
    .order('published_at', { ascending: false })
    .limit(5);

  if (error) throw error;
  return data || [];
}

async function countDispatchedEventsLastHour() {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [eventResult, deliveryResult] = await Promise.all([
    supabase
      .from('event_store')
      .select('id, dispatch_message_id, event_name, created_at', { count: 'exact' })
      .eq('source', auditSource)
      .not('dispatch_message_id', 'is', null)
      .gte('created_at', cutoff),
    supabase
      .from('external_delivery_logs')
      .select('id, provider_message_id, event_store_id, published_at', { count: 'exact' })
      .eq('source', auditSource)
      .gte('published_at', cutoff),
  ]);

  if (eventResult.error) throw eventResult.error;
  if (deliveryResult.error) throw deliveryResult.error;

  return {
    window: 'last_1_hour',
    source_filter: auditSource,
    total_events: eventResult.count || 0,
    total_delivery_logs: deliveryResult.count || 0,
    event_ids: (eventResult.data || []).map((row) => row.id),
    delivery_ids: (deliveryResult.data || []).map((row) => row.provider_message_id),
  };
}

async function countOverallDispatchedEventsLastHour() {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [eventResult, deliveryResult] = await Promise.all([
    supabase
      .from('event_store')
      .select('id', { count: 'exact' })
      .not('dispatch_message_id', 'is', null)
      .gte('created_at', cutoff),
    supabase
      .from('external_delivery_logs')
      .select('id', { count: 'exact' })
      .gte('published_at', cutoff),
  ]);

  if (eventResult.error) throw eventResult.error;
  if (deliveryResult.error) throw deliveryResult.error;

  return {
    window: 'last_1_hour',
    scope: 'overall',
    total_events: eventResult.count || 0,
    total_delivery_logs: deliveryResult.count || 0,
  };
}

async function cleanupSyntheticRows(messageIds) {
  for (const messageId of messageIds) {
    try {
      await qstash.messages.cancel(messageId);
    } catch {}
  }

  const eventIdsResult = await supabase.from('event_store').select('id').eq('source', auditSource);
  if (eventIdsResult.error) throw eventIdsResult.error;
  const eventIds = (eventIdsResult.data || []).map((row) => row.id);

  if (eventIds.length) {
    const relatedLogs = await supabase
      .from('external_delivery_logs')
      .select('id, provider_message_id')
      .in('event_store_id', eventIds);

    if (relatedLogs.error) throw relatedLogs.error;

    for (const row of relatedLogs.data || []) {
      if (row.provider_message_id) {
        try {
          await qstash.messages.cancel(row.provider_message_id);
        } catch {}
      }
    }

    await deleteRowsByIds('external_delivery_logs', (relatedLogs.data || []).map((row) => row.id));
  }

  await supabase.from('contact_events').delete().ilike('contact_id', `${auditMarker}%`);
  await supabase.from('contact_inquiries').delete().eq('source', auditSource);
  await supabase.from('external_delivery_logs').delete().eq('source', auditSource);
  await supabase.from('event_store').delete().eq('source', auditSource);
  await supabase.from('generation_queue').delete().eq('created_by', auditSource);
}

async function cleanupPreviousAuditResidue() {
  const lingeringLogs = await supabase
    .from('external_delivery_logs')
    .select('id, provider_message_id, request_payload, source')
    .order('created_at', { ascending: false })
    .limit(200);

  if (lingeringLogs.error) throw lingeringLogs.error;

  const auditLogs = (lingeringLogs.data || []).filter((row) => {
    const marker = row.request_payload?.audit_marker;
    return row.source === auditSource || (typeof marker === 'string' && marker.startsWith('ZERO_TRUST_C26_'));
  });

  for (const row of auditLogs) {
    if (row.provider_message_id) {
      try {
        await qstash.messages.cancel(row.provider_message_id);
      } catch {}
    }
  }

  await deleteRowsByIds('external_delivery_logs', auditLogs.map((row) => row.id));
  await supabase.from('contact_events').delete().ilike('contact_id', 'ZERO_TRUST_C26_%');
  await supabase.from('contact_inquiries').delete().eq('source', auditSource);
  await supabase.from('event_store').delete().eq('source', auditSource);
  await supabase.from('generation_queue').delete().eq('created_by', auditSource);
}

async function run() {
  await cleanupPreviousAuditResidue();

  const login = await adminLogin();
  if (!login.cookie) {
    throw new Error('admin_login_failed');
  }

  const success = await createSuccessDispatch(1);
  const retryFailure = await createFailureDispatch(1, 1);
  const fastFailureA = await createFailureDispatch(2, 0);
  const fastFailureB = await createFailureDispatch(3, 0);
  const fastFailureC = await createFailureDispatch(4, 0);

  const chosenEventId = success.event.id;
  const chosenMessageId = success.delivery.provider_message_id;
  const chosenEventStore = await readEventStoreRow(chosenEventId);
  const chosenDelivery = await readDeliveryRow(chosenMessageId);

  const deliveryApi = await adminGet(login.cookie, `/api/admin/delivery-logs?limit=5&event_id=${encodeURIComponent(chosenEventId)}&message_id=${encodeURIComponent(chosenMessageId)}`);
  const deliveryApiLatest = await adminGet(login.cookie, '/api/admin/delivery-logs?limit=5');
  const healthApi = await adminGet(login.cookie, '/api/admin/system/health');
  const latest = await latestRows();
  const counts = await countDispatchedEventsLastHour();
  const overallCounts = await countOverallDispatchedEventsLastHour();

  const retryFailureEventStore = await readEventStoreRow(retryFailure.event.id);
  const retryFailureDelivery = await readDeliveryRow(retryFailure.delivery.provider_message_id);
  const retryFailureLogs = retryFailure.provider.logs || [];
  const retryFailureLatestProviderState = retryFailureLogs.length > 0 ? retryFailureLogs[retryFailureLogs.length - 1].state : null;

  const proof = {
    captured_at: new Date().toISOString(),
    audit_marker: auditMarker,
    source_filter: auditSource,
    live_db_snapshot: latest.map((row) => ({
      event_id: row.event_store_id,
      delivery_id: row.provider_message_id,
      delivery_status: row.status,
      attempt_count: row.attempt_count,
      provider_retry_count: row.provider_retry_count,
      timestamps: {
        published_at: row.published_at,
        first_provider_event_at: row.first_provider_event_at,
        last_provider_event_at: row.last_provider_event_at,
        delivered_at: row.delivered_at,
        failed_at: row.failed_at,
        last_sync_at: row.last_sync_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    })),
    event_trace_match: {
      event_id: chosenEventId,
      event_store: chosenEventStore,
      delivery_logs: chosenDelivery,
      admin_api: deliveryApi.body,
      health_metrics: {
        delivery_logs_metrics: deliveryApi.body?.metrics || null,
        system_health_summary: healthApi.body?.summary || null,
        system_health_failures: healthApi.body?.failures || null,
        system_health_metrics: healthApi.body?.metrics || null,
      },
    },
    failure_retry_proof: {
      event_id: retryFailure.event.id,
      delivery_id: retryFailure.delivery.provider_message_id,
      event_store: retryFailureEventStore,
      delivery_logs: {
        delivery_status: retryFailureDelivery.status,
        attempt_count: retryFailureDelivery.attempt_count,
        provider_retry_count: retryFailureDelivery.provider_retry_count,
        failed_at: retryFailureDelivery.failed_at,
        last_provider_event_at: retryFailureDelivery.last_provider_event_at,
        attempt_history: retryFailureLogs.map((log) => ({
          state: log.state,
          time: toIsoOrNull(log.time),
          response_status: log.responseStatus || null,
          error: log.error || null,
          next_delivery_time: toIsoOrNull(log.nextDeliveryTime),
        })),
        final_status: retryFailureDelivery.status,
      },
    },
    provider_match_proof: {
      event_id: retryFailure.event.id,
      delivery_id: retryFailure.delivery.provider_message_id,
      provider_status: retryFailureLatestProviderState,
      db_status: retryFailureDelivery.status,
      provider_latest_event: retryFailureLogs.length > 0 ? retryFailureLogs[retryFailureLogs.length - 1] : null,
    },
    no_silent_failure_check: {
      audit_scope: counts,
      overall_scope: overallCounts,
    },
    live_api_output: {
      delivery_logs_trace: deliveryApi.body,
      delivery_logs_latest: deliveryApiLatest.body,
      system_health: healthApi.body,
    },
  };

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const filePath = path.join(RESULTS_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}-cto-c26-zero-trust-proof.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
  console.log(`RESULT_FILE=${filePath}`);

  await cleanupSyntheticRows([
    success.delivery.provider_message_id,
    retryFailure.delivery.provider_message_id,
    fastFailureA.delivery.provider_message_id,
    fastFailureB.delivery.provider_message_id,
    fastFailureC.delivery.provider_message_id,
  ]);
}

await run();