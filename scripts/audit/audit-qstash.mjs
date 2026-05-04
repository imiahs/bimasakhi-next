import { Client } from '@upstash/qstash';
import { addCheck, addError, canonicalBaseUrl, envPresence, fetchWithTimeout, finalize, loadEnv, makeResult, TEST_PREFIX, writeResult } from './_auditUtils.mjs';

loadEnv();
const result = makeResult('qstash');

try {
  addCheck(result, 'env_presence_masked', 'INFO', envPresence(['QSTASH_TOKEN']));

  if (!process.env.QSTASH_TOKEN) {
    addCheck(result, 'qstash_configured', 'FAIL', { reason: 'QSTASH_TOKEN missing' });
  } else {
    const client = new Client({ token: process.env.QSTASH_TOKEN });
    const targetUrl = `${canonicalBaseUrl()}/api/test`;
    const marker = `${TEST_PREFIX}QSTASH_${Date.now()}`;
    const publishRes = await client.publishJSON({
      url: targetUrl,
      body: { marker, audit: true },
      retries: 0,
    });

    addCheck(result, 'publish_test_message', publishRes?.messageId ? 'PASS' : 'FAIL', {
      target_url: targetUrl,
      message_id: publishRes?.messageId || null,
      response_keys: publishRes ? Object.keys(publishRes) : [],
    });

    await new Promise((resolve) => setTimeout(resolve, 7000));

    try {
      const logs = await fetchWithTimeout('https://qstash.upstash.io/v2/logs', {
        headers: { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` },
      }, 25000);
      const serialized = JSON.stringify(logs.body);
      const found = publishRes?.messageId ? serialized.includes(publishRes.messageId) : false;
      addCheck(result, 'qstash_delivery_log_lookup', logs.ok && found ? 'PASS' : 'PARTIAL', {
        status: logs.status,
        logs_api_ok: logs.ok,
        message_id_found: found,
        body_sample: serialized.slice(0, 500),
      });
    } catch (error) {
      addError(result, 'qstash_delivery_log_lookup', error);
    }
  }
} catch (error) {
  addError(result, 'qstash_unhandled', error);
}

writeResult(finalize(result));

