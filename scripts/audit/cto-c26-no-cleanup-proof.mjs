import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Client as QStashClient } from '@upstash/qstash';
import {
  RESULTS_DIR,
  adminLoginPayload,
  canonicalBaseUrl,
  getServiceSupabase,
  loadEnv,
} from './_auditUtils.mjs';

loadEnv();

const WAIT_MS = 6 * 60 * 1000;
const RETRY_VISIBILITY_TIMEOUT_MS = 2 * 60 * 1000;
const FINAL_PROGRESS_TIMEOUT_MS = 2 * 60 * 1000;
const baseUrl = canonicalBaseUrl();
const supabase = getServiceSupabase();
const qstash = new QStashClient({ token: process.env.QSTASH_TOKEN });
const auditSource = 'audit_c26_no_cleanup';
const auditMarker = `NO_CLEANUP_C26_${Date.now()}`;

function randomDigits(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

function sortLogs(logs = []) {
  return [...logs].sort((left, right) => Number(left?.time || 0) - Number(right?.time || 0));
}

function toIsoOrNull(value) {
  if (!value && value !== 0) return null;
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp).toISOString();
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
    responseStatus: latestLog.responseStatus || null,
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
  const { data, error } = await supabase.from('generation_queue').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

async function insertEventStore(row) {
  const { data, error } = await supabase.from('event_store').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

async function insertContactInquiry(row) {
  const { data, error } = await supabase.from('contact_inquiries').insert(row).select('*').single();
  if (error) throw error;
  return data;
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
    source: auditSource,
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

  const { error } = await supabase.from('external_delivery_logs').upsert(row, { onConflict: 'provider_message_id' });
  if (error) throw error;
}

async function readEventStoreRow(eventStoreId) {
  const { data, error } = await supabase.from('event_store').select('*').eq('id', eventStoreId).single();
  if (error) throw error;
  return data;
}

async function readDeliveryRow(messageId) {
  const { data, error } = await supabase.from('external_delivery_logs').select('*').eq('provider_message_id', messageId).single();
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
  const deliveredLog = [...logs].reverse().find((log) => log.state === 'DELIVERED') || null;
  const failedLog = [...logs].reverse().find((log) => log.state === 'FAILED' || log.state === 'CANCELED' || (log.state === 'ERROR' && (!log.nextDeliveryTime || log.nextDeliveryTime <= Date.now()))) || null;

  const row = {
    provider_message: snapshot.message,
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
    status: deriveDeliveryStatus(snapshot.message, logs),
  };

  const { error } = await supabase.from('external_delivery_logs').update(row).eq('provider_message_id', messageId);
  if (error) throw error;

  return {
    delivery: await readDeliveryRow(messageId),
    provider: snapshot,
  };
}

async function waitForDelivery(messageId, timeoutMs = 90000, intervalMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;

  while (Date.now() < deadline) {
    last = await syncExternalDelivery(messageId);
    if (last.delivery.status === 'delivered') {
      return last;
    }
    await delay(intervalMs);
  }

  return last;
}

async function waitForRetryVisible(messageId, timeoutMs = RETRY_VISIBILITY_TIMEOUT_MS, intervalMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;

  while (Date.now() < deadline) {
    last = await syncExternalDelivery(messageId);
    const logs = last.provider.logs || [];
    const hasRetry = logs.some((log) => log.state === 'RETRY');
    const hasError = logs.some((log) => log.state === 'ERROR');
    if (hasRetry && hasError) {
      return last;
    }
    await delay(intervalMs);
  }

  return last;
}

async function waitForProgressAfterDelay(messageId, baselineSnapshot, timeoutMs = FINAL_PROGRESS_TIMEOUT_MS, intervalMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;

  while (Date.now() < deadline) {
    last = await syncExternalDelivery(messageId);
    if (
      last.delivery.status !== baselineSnapshot.delivery.status ||
      last.delivery.provider_retry_count !== baselineSnapshot.delivery.provider_retry_count ||
      last.delivery.attempt_count !== baselineSnapshot.delivery.attempt_count
    ) {
      return last;
    }
    await delay(intervalMs);
  }

  return last;
}

async function createSuccessDispatch() {
  const queue = await insertGenerationQueue({
    task_type: 'pagegen',
    payload: {
      pages: [
        {
          slug: `${auditMarker.toLowerCase()}-success`,
          keyword_text: `${auditMarker} success`,
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
    contact_id: `${auditMarker}_CONTACT_${crypto.randomUUID()}`,
    name: `${auditMarker} Contact`,
    mobile: `9${randomDigits(9)}`,
    email: `${auditMarker.toLowerCase()}_${randomDigits(4)}@example.com`,
    reason: 'cto_no_cleanup_c26',
    message: `${auditMarker} delivered proof`,
    source: auditSource,
    pipeline: 'audit',
    tag: auditMarker,
    sync_status: 'pending',
  });

  const correlationId = `${auditMarker}_success_${crypto.randomUUID()}`;
  const event = await insertEventStore({
    event_name: 'contact_created',
    payload: {
      contactId: contact.contact_id,
      queueId: queue.id,
      audit_marker: auditMarker,
    },
    source: auditSource,
    status: 'pending',
    priority: 'critical',
    retry_count: 0,
    max_retries: 1,
    execution_context: {
      audit: 'c26_no_cleanup',
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
      audit: 'c26_no_cleanup',
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
    queue,
    contact,
    event,
    delivery: settled.delivery,
    provider: settled.provider,
    triggered_at: new Date().toISOString(),
  };
}

async function createFailureDispatch() {
  const queue = await insertGenerationQueue({
    task_type: 'pagegen',
    payload: {
      pages: [
        {
          slug: `${auditMarker.toLowerCase()}-failure`,
          keyword_text: `${auditMarker} failure`,
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

  const probeId = `NO_ROUTE_${randomDigits(12)}`;
  const correlationId = `${auditMarker}_failure_${crypto.randomUUID()}`;
  const event = await insertEventStore({
    event_name: 'delivery_probe_failure',
    payload: {
      probeId,
      queueId: queue.id,
      audit_marker: auditMarker,
      target: 'missing_route',
    },
    source: auditSource,
    status: 'pending',
    priority: 'critical',
    retry_count: 0,
    max_retries: 0,
    execution_context: {
      audit: 'c26_no_cleanup',
      correlation_id: correlationId,
      event_id: correlationId,
    },
    correlation_id: correlationId,
  });

  const body = {
    probeId,
    queueId: queue.id,
    audit_marker: auditMarker,
    _execution_context: {
      audit: 'c26_no_cleanup',
      correlation_id: correlationId,
      event_id: correlationId,
    },
    _event_name: 'delivery_probe_failure',
    _executive: 'cso',
    _event_store_id: event.id,
  };

  const targetPath = '/api/jobs/c26-no-cleanup-missing-route';
  const targetUrl = `${baseUrl}${targetPath}`;
  const response = await qstash.publishJSON({
    url: targetUrl,
    body,
    retries: 2,
  });

  await markDispatched(event.id, response.messageId);
  await recordExternalDelivery({
    messageId: response.messageId,
    eventName: 'delivery_probe_failure',
    eventStoreId: event.id,
    generationQueueId: queue.id,
    targetUrl,
    targetPath,
    requestPayload: body,
    providerResponse: response,
  });

  return {
    queue,
    event,
    probe_id: probeId,
    message_id: response.messageId,
    triggered_at: new Date().toISOString(),
  };
}

function summarizeDeliveryRow(row) {
  return {
    id: row.id,
    provider_message_id: row.provider_message_id,
    status: row.status,
    source: row.source,
    event_name: row.event_name,
    event_store_id: row.event_store_id,
    generation_queue_id: row.generation_queue_id,
    attempt_count: row.attempt_count,
    provider_retry_count: row.provider_retry_count,
    published_at: row.published_at,
    delivered_at: row.delivered_at,
    failed_at: row.failed_at,
    last_sync_at: row.last_sync_at,
    latest_event_state: row.latest_event?.state || null,
    latest_event_time: toIsoOrNull(row.latest_event?.time),
    latest_event_response_status: row.latest_event?.responseStatus || null,
    error_payload: row.error_payload,
    sync_error: row.sync_error,
  };
}

function summarizeFailureSnapshot(snapshot) {
  const logs = snapshot.provider.logs || [];
  return {
    delivery: {
      status: snapshot.delivery.status,
      attempt_count: snapshot.delivery.attempt_count,
      provider_retry_count: snapshot.delivery.provider_retry_count,
      failed_at: snapshot.delivery.failed_at,
      last_provider_event_at: snapshot.delivery.last_provider_event_at,
      latest_event_state: snapshot.delivery.latest_event?.state || null,
      error_payload: snapshot.delivery.error_payload,
    },
    errors: logs
      .filter((log) => log.state === 'ERROR')
      .map((log) => ({
        time: toIsoOrNull(log.time),
        response_status: log.responseStatus || null,
        error: log.error || null,
      })),
    retries: logs
      .filter((log) => log.state === 'RETRY')
      .map((log) => ({
        time: toIsoOrNull(log.time),
        next_delivery_time: toIsoOrNull(log.nextDeliveryTime),
      })),
    attempt_history: logs.map((log) => ({
      state: log.state,
      time: toIsoOrNull(log.time),
      response_status: log.responseStatus || null,
      error: log.error || null,
      next_delivery_time: toIsoOrNull(log.nextDeliveryTime),
    })),
  };
}

async function readLatestDeliveryRows(limit = 10) {
  const { data, error } = await supabase
    .from('external_delivery_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(summarizeDeliveryRow);
}

async function buildTrace(cookie, eventId, messageId) {
  const [eventStore, deliveryLogs, provider, api] = await Promise.all([
    readEventStoreRow(eventId),
    readDeliveryRow(messageId),
    getQStashSnapshot(messageId),
    adminGet(cookie, `/api/admin/delivery-logs?limit=10&event_id=${encodeURIComponent(eventId)}&message_id=${encodeURIComponent(messageId)}`),
  ]);

  return {
    event_id: eventId,
    event_store: eventStore,
    delivery_logs: deliveryLogs,
    provider: {
      message_error: provider.message_error,
      logs_error: provider.logs_error,
      latest_event: provider.logs[provider.logs.length - 1] || null,
      attempt_history: provider.logs,
    },
    api: api.body,
  };
}

async function run() {
  const login = await adminLogin();
  if (!login.cookie) {
    throw new Error('admin_login_failed');
  }

  const success = await createSuccessDispatch();
  const failure = await createFailureDispatch();
  const failureBeforeWait = await waitForRetryVisible(failure.message_id);

  const waitStartedAt = new Date().toISOString();
  await delay(WAIT_MS);
  const failureAfterWait = await waitForProgressAfterDelay(failure.message_id, failureBeforeWait);
  const waitCompletedAt = new Date().toISOString();

  const [successTrace, failureTrace, latest10, deliveryLogsApi, systemHealthApi] = await Promise.all([
    buildTrace(login.cookie, success.event.id, success.delivery.provider_message_id),
    buildTrace(login.cookie, failure.event.id, failure.message_id),
    readLatestDeliveryRows(10),
    adminGet(login.cookie, '/api/admin/delivery-logs?limit=10'),
    adminGet(login.cookie, '/api/admin/system/health'),
  ]);

  const proof = {
    captured_at: new Date().toISOString(),
    audit_marker: auditMarker,
    source_filter: auditSource,
    real_time_event_execution: {
      success_event: {
        triggered_at: success.triggered_at,
        event_id: success.event.id,
        delivery_id: success.delivery.provider_message_id,
        event_name: success.event.event_name,
        final_status: success.delivery.status,
      },
      failure_event: {
        triggered_at: failure.triggered_at,
        event_id: failure.event.id,
        delivery_id: failure.message_id,
        event_name: failure.event.event_name,
        requested_provider_retries: 2,
      },
    },
    live_db_state: {
      external_delivery_logs_latest_10: latest10,
    },
    event_trace: {
      success_event: successTrace,
      failure_event: failureTrace,
    },
    failure_visibility: {
      before_wait: summarizeFailureSnapshot(failureBeforeWait),
      after_wait: summarizeFailureSnapshot(failureAfterWait),
    },
    metrics_consistency: {
      delivery_logs_api: deliveryLogsApi.body,
      system_health_api: systemHealthApi.body,
    },
    wait_test: {
      wait_started_at: waitStartedAt,
      wait_completed_at: waitCompletedAt,
      waited_seconds: Math.round((new Date(waitCompletedAt).getTime() - new Date(waitStartedAt).getTime()) / 1000),
      failure_before_wait: {
        status: failureBeforeWait.delivery.status,
        attempt_count: failureBeforeWait.delivery.attempt_count,
        provider_retry_count: failureBeforeWait.delivery.provider_retry_count,
        latest_event_state: failureBeforeWait.provider.logs[failureBeforeWait.provider.logs.length - 1]?.state || null,
      },
      failure_after_wait: {
        status: failureAfterWait.delivery.status,
        attempt_count: failureAfterWait.delivery.attempt_count,
        provider_retry_count: failureAfterWait.delivery.provider_retry_count,
        latest_event_state: failureAfterWait.provider.logs[failureAfterWait.provider.logs.length - 1]?.state || null,
      },
    },
  };

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const filePath = path.join(RESULTS_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}-cto-c26-no-cleanup-proof.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
  console.log(`RESULT_FILE=${filePath}`);
}

await run();