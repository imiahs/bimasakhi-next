import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Client as QStashClient } from '@upstash/qstash';
import {
  addCheck,
  addError,
  adminLoginPayload,
  canonicalBaseUrl,
  envPresence,
  finalize,
  getServiceSupabase,
  loadEnv,
  makeResult,
  TEST_PREFIX,
  writeResult,
} from './_auditUtils.mjs';

loadEnv();

const result = makeResult('c26-delivery-truth-proof');
const baseUrl = canonicalBaseUrl();
const supabase = getServiceSupabase();
const qstash = process.env.QSTASH_TOKEN ? new QStashClient({ token: process.env.QSTASH_TOKEN }) : null;
const auditMarker = `${TEST_PREFIX}C26_${Date.now()}`;

function randomDigits(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
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

async function adminPost(cookie, path, body) {
  return fetchJson(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: baseUrl,
    },
    body: JSON.stringify(body),
  }, 60000);
}

async function adminGet(cookie, path) {
  return fetchJson(`${baseUrl}${path}`, {
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

async function getEventStoreRow(eventStoreId) {
  const { data, error } = await supabase
    .from('event_store')
    .select('*')
    .eq('id', eventStoreId)
    .single();

  if (error) throw error;
  return data;
}

async function getQueueRow(queueId) {
  const { data, error } = await supabase
    .from('generation_queue')
    .select('*')
    .eq('id', queueId)
    .single();

  if (error) throw error;
  return data;
}

async function getDeliveryRow(messageId) {
  const { data, error } = await supabase
    .from('external_delivery_logs')
    .select('*')
    .eq('provider_message_id', messageId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getMigrationRow() {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('migration_name, executed_at')
    .eq('migration_name', '20260427090000_c26_external_delivery_truth.sql')
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getQStashSnapshot(messageId) {
  if (!qstash || !messageId) {
    return { message: null, logs: [] };
  }

  const [messageResult, logsResult] = await Promise.allSettled([
    qstash.messages.get(messageId),
    qstash.logs({ messageIds: [messageId] }),
  ]);

  return {
    message: messageResult.status === 'fulfilled' ? messageResult.value : null,
    message_error: messageResult.status === 'rejected' ? messageResult.reason?.message || String(messageResult.reason) : null,
    logs: logsResult.status === 'fulfilled'
      ? [...(logsResult.value?.logs || [])].sort((left, right) => Number(left?.time || 0) - Number(right?.time || 0))
      : [],
    logs_error: logsResult.status === 'rejected' ? logsResult.reason?.message || String(logsResult.reason) : null,
  };
}

async function syncMessage(cookie, messageId) {
  return adminGet(cookie, `/api/admin/delivery-logs?sync=true&message_id=${encodeURIComponent(messageId)}&limit=5`);
}

async function waitForSnapshot({ cookie, messageId, timeoutMs, intervalMs, predicate }) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const syncResponse = await syncMessage(cookie, messageId);
    const deliveryRow = await getDeliveryRow(messageId);
    const qstashSnapshot = await getQStashSnapshot(messageId);
    const snapshot = {
      syncResponse,
      deliveryRow,
      qstashSnapshot,
    };

    if (predicate(snapshot)) {
      return snapshot;
    }

    await delay(intervalMs);
  }

  return {
    syncResponse: await syncMessage(cookie, messageId),
    deliveryRow: await getDeliveryRow(messageId),
    qstashSnapshot: await getQStashSnapshot(messageId),
  };
}

async function getFailureObservability(messageId) {
  const { data, error } = await supabase
    .from('observability_logs')
    .select('level, message, source, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data || []).filter((entry) => {
    const level = String(entry.level || '').toUpperCase();
    const message = String(entry.message || '');
    return level.includes('QSTASH') || message.includes(messageId);
  });
}

try {
  addCheck(result, 'env_presence_masked', 'INFO', envPresence([
    'ADMIN_PASSWORD',
    'QSTASH_TOKEN',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_URL',
  ]));

  const migrationRow = await getMigrationRow();
  addCheck(result, 'c26_migration_recorded', migrationRow ? 'PASS' : 'FAIL', {
    migration_name: migrationRow?.migration_name || null,
    executed_at: migrationRow?.executed_at || null,
  });

  const login = await adminLogin();
  addCheck(result, 'admin_login', login.ok && login.cookie ? 'PASS' : 'FAIL', {
    status: login.status,
    ok: login.ok,
    cookie_present: Boolean(login.cookie),
    body: login.body,
  });

  if (!login.cookie) {
    throw new Error('Admin login failed; cannot run live C26 audit.');
  }

  const successQueue = await insertGenerationQueue({
    task_type: 'pagegen',
    payload: {
      pages: [
        {
          slug: `${auditMarker.toLowerCase()}-success-skip`,
          keyword_text: `${auditMarker} success skip`,
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
    created_by: 'audit_c26_delivery_truth',
  });

  const successContactId = `${auditMarker}_CONTACT_${crypto.randomUUID()}`;
  const successContact = await insertContactInquiry({
    contact_id: successContactId,
    name: `${auditMarker} Contact`,
    mobile: `9${randomDigits(9)}`,
    email: `${auditMarker.toLowerCase().replace(/[^a-z0-9]+/g, '')}.${randomDigits(4)}@example.com`,
    reason: 'c26_delivery_truth_audit',
    message: `${auditMarker} live delivered proof`,
    source: 'audit_c26_delivery_truth',
    pipeline: 'audit',
    tag: auditMarker,
    sync_status: 'pending',
  });

  const successCorrelationId = `${auditMarker}_success_${crypto.randomUUID()}`;
  const successEvent = await insertEventStore({
    event_name: 'contact_created',
    payload: {
      contactId: successContact.contact_id,
      queueId: successQueue.id,
      audit_marker: auditMarker,
    },
    source: 'audit_c26_delivery_truth',
    status: 'pending',
    priority: 'critical',
    retry_count: 0,
    max_retries: 1,
    execution_context: {
      audit: 'c26_delivery_truth',
      correlation_id: successCorrelationId,
      event_id: successCorrelationId,
    },
    correlation_id: successCorrelationId,
  });

  addCheck(result, 'success_setup_rows_created', 'PASS', {
    generation_queue_id: successQueue.id,
    contact_id: successContact.contact_id,
    event_store_id: successEvent.id,
  });

  const successDispatch = await adminPost(login.cookie, '/api/admin/actions', {
    action: 'retry_event_store',
    event_store_id: successEvent.id,
  });

  addCheck(result, 'success_dispatch_requested', successDispatch.ok && successDispatch.body?.message_id ? 'PASS' : 'FAIL', {
    status: successDispatch.status,
    body: successDispatch.body,
  });

  const successMessageId = successDispatch.body?.message_id || null;
  const successSnapshot = await waitForSnapshot({
    cookie: login.cookie,
    messageId: successMessageId,
    timeoutMs: 120000,
    intervalMs: 5000,
    predicate: (snapshot) => snapshot.deliveryRow?.status === 'delivered',
  });

  const successEventFinal = await getEventStoreRow(successEvent.id);
  const successDeliveryRow = successSnapshot.deliveryRow;
  const successQStash = successSnapshot.qstashSnapshot;

  addCheck(result, 'success_db_and_provider_truth', successDeliveryRow?.status === 'delivered' ? 'PASS' : 'FAIL', {
    message_id: successMessageId,
    delivery_row: successDeliveryRow,
    qstash_message: successQStash.message,
    qstash_logs: successQStash.logs,
  });

  addCheck(result, 'success_event_linkage', (
    successDeliveryRow?.event_store_id === successEvent.id
      && successDeliveryRow?.generation_queue_id === successQueue.id
      && successEventFinal?.dispatch_message_id === successMessageId
      && successEventFinal?.status === 'completed'
  ) ? 'PASS' : 'FAIL', {
    event_store: successEventFinal,
    generation_queue_id: successQueue.id,
    delivery_row_event_store_id: successDeliveryRow?.event_store_id || null,
    delivery_row_generation_queue_id: successDeliveryRow?.generation_queue_id || null,
  });

  const failureQueue = await insertGenerationQueue({
    task_type: 'pagegen',
    payload: {
      pages: [
        {
          slug: `${auditMarker.toLowerCase()}-failure-link`,
          keyword_text: `${auditMarker} failure linkage`,
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
    created_by: 'audit_c26_delivery_truth',
  });

  const failureLeadId = `00000000-0000-0000-0000-${randomDigits(12)}`;

  const failureCorrelationId = `${auditMarker}_failure_${crypto.randomUUID()}`;
  const failureEvent = await insertEventStore({
    event_name: 'lead_hot',
    payload: {
      leadId: failureLeadId,
      queueId: failureQueue.id,
      audit_marker: auditMarker,
    },
    source: 'audit_c26_delivery_truth',
    status: 'pending',
    priority: 'normal',
    retry_count: 0,
    max_retries: 1,
    execution_context: {
      audit: 'c26_delivery_truth',
      correlation_id: failureCorrelationId,
      event_id: failureCorrelationId,
    },
    correlation_id: failureCorrelationId,
  });

  addCheck(result, 'failure_setup_rows_created', 'PASS', {
    generation_queue_id: failureQueue.id,
    event_store_id: failureEvent.id,
    failure_shape: 'lead_hot_missing_lead_causes_followup_500',
    lead_id: failureLeadId,
  });

  const failureDispatch = await adminPost(login.cookie, '/api/admin/actions', {
    action: 'retry_event_store',
    event_store_id: failureEvent.id,
  });

  addCheck(result, 'failure_dispatch_requested', failureDispatch.ok && failureDispatch.body?.message_id ? 'PASS' : 'FAIL', {
    status: failureDispatch.status,
    body: failureDispatch.body,
  });

  const failureMessageId = failureDispatch.body?.message_id || null;
  let failureSnapshot = await waitForSnapshot({
    cookie: login.cookie,
    messageId: failureMessageId,
    timeoutMs: 120000,
    intervalMs: 5000,
    predicate: (snapshot) => {
      const row = snapshot.deliveryRow;
      const logs = snapshot.qstashSnapshot.logs || [];
      return Boolean(
        row
        && (row.status === 'failed'
          || row.status === 'cancelled'
          || (row.provider_retry_count || 0) > 0
          || logs.some((log) => ['FAILED', 'CANCELED', 'RETRY'].includes(log.state)))
      );
    },
  });

  const failureLogsPreCancel = failureSnapshot.qstashSnapshot.logs || [];
  const failureWasTerminal = ['failed', 'cancelled'].includes(failureSnapshot.deliveryRow?.status || '')
    || failureLogsPreCancel.some((log) => ['FAILED', 'CANCELED'].includes(log.state));

  if (!failureWasTerminal && qstash && failureMessageId) {
    const cancelResult = await qstash.messages.cancel(failureMessageId);
    addCheck(result, 'failure_cancel_requested', (cancelResult?.cancelled || 0) > 0 ? 'PASS' : 'FAIL', {
      message_id: failureMessageId,
      cancel_result: cancelResult,
    });

    failureSnapshot = await waitForSnapshot({
      cookie: login.cookie,
      messageId: failureMessageId,
      timeoutMs: 60000,
      intervalMs: 5000,
      predicate: (snapshot) => {
        const row = snapshot.deliveryRow;
        const logs = snapshot.qstashSnapshot.logs || [];
        return Boolean(
          row
          && (row.status === 'failed'
            || row.status === 'cancelled'
            || logs.some((log) => ['FAILED', 'CANCELED'].includes(log.state)))
        );
      },
    });
  }

  const failureEventFinal = await getEventStoreRow(failureEvent.id);
  const failureQueueFinal = await getQueueRow(failureQueue.id);
  const failureDeliveryRow = failureSnapshot.deliveryRow;
  const failureQStash = failureSnapshot.qstashSnapshot;
  const failureObservability = await getFailureObservability(failureMessageId);
  const failureLogs = failureQStash.logs || [];
  const retryObserved = Boolean(
    (failureDeliveryRow?.provider_retry_count || 0) > 0
    || (failureDeliveryRow?.attempt_count || 0) > 1
    || failureLogs.some((log) => log.state === 'RETRY')
  );
  const providerFailureObserved = Boolean(
    failureDeliveryRow
    && (failureDeliveryRow.status === 'failed'
      || failureDeliveryRow.status === 'cancelled'
      || failureLogs.some((log) => ['ERROR', 'FAILED', 'RETRY', 'CANCELED'].includes(log.state)))
  );

  addCheck(result, 'failure_provider_truth_visible', providerFailureObserved ? 'PASS' : 'FAIL', {
    message_id: failureMessageId,
    delivery_row: failureDeliveryRow,
    qstash_message: failureQStash.message,
    qstash_logs: failureLogs,
    observability_logs: failureObservability,
  });

  addCheck(result, 'retry_history_observable', retryObserved ? 'PASS' : 'FAIL', {
    attempt_count: failureDeliveryRow?.attempt_count || 0,
    provider_retry_count: failureDeliveryRow?.provider_retry_count || 0,
    latest_event: failureDeliveryRow?.latest_event || null,
    qstash_log_states: failureLogs.map((log) => log.state),
  });

  addCheck(result, 'failure_event_linkage', (
    failureDeliveryRow?.event_store_id === failureEvent.id
      && failureDeliveryRow?.generation_queue_id === failureQueue.id
  ) ? 'PASS' : 'FAIL', {
    delivery_row_event_store_id: failureDeliveryRow?.event_store_id || null,
    delivery_row_generation_queue_id: failureDeliveryRow?.generation_queue_id || null,
    expected_event_store_id: failureEvent.id,
    expected_generation_queue_id: failureQueue.id,
  });

  addCheck(result, 'failure_not_silent', (
    failureEventFinal?.status === 'failed'
      && ['failed', 'cancelled'].includes(failureDeliveryRow?.status || '')
      && providerFailureObserved
      && (failureObservability.length > 0 || failureLogs.some((log) => ['ERROR', 'FAILED', 'RETRY', 'CANCELED'].includes(log.state)))
  ) ? 'PASS' : 'FAIL', {
    event_store: failureEventFinal,
    generation_queue: failureQueueFinal,
    delivery_row_status: failureDeliveryRow?.status || null,
  });

  await adminGet(login.cookie, '/api/admin/delivery-logs?sync=true&limit=25');
  const deliveryApi = await adminGet(login.cookie, `/api/admin/delivery-logs?limit=10&message_id=${encodeURIComponent(failureMessageId)}`);
  const systemHealth = await adminGet(login.cookie, '/api/admin/system/health');

  const deliveryMetrics = deliveryApi.body?.metrics || null;
  const healthMetrics = systemHealth.body?.metrics || null;
  const healthFailures = systemHealth.body?.failures || null;

  addCheck(result, 'admin_api_and_health_match', (
    deliveryMetrics
      && healthMetrics
      && healthFailures
      && deliveryMetrics.delivery_failures_recent === healthFailures.delivery_failures_recent
      && deliveryMetrics.delivery_stuck_count === healthFailures.delivery_stuck_count
      && deliveryMetrics.delivery_success_rate === healthMetrics.delivery_success_rate
      && deliveryMetrics.delivery_failures_recent >= 1
  ) ? 'PASS' : 'FAIL', {
    delivery_api_metrics: deliveryMetrics,
    system_health_metrics: healthMetrics,
    system_health_failures: healthFailures,
  });

  const failedChecks = result.checks.filter((check) => check.status === 'FAIL').map((check) => check.name);
  addCheck(result, 'c26_delivery_truth_verdict', failedChecks.length === 0 ? 'PASS' : 'FAIL', {
    audit_marker: auditMarker,
    success_message_id: successMessageId,
    failure_message_id: failureMessageId,
    failed_checks: failedChecks,
  });
} catch (error) {
  addError(result, 'c26_delivery_truth_unhandled', error);
}

writeResult(finalize(result));