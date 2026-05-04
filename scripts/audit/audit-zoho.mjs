import axios from 'axios';
import { addCheck, addError, envPresence, finalize, loadEnv, makeResult, TEST_PREFIX, writeResult } from './_auditUtils.mjs';

loadEnv();
const result = makeResult('zoho');

function accountsUrl() {
  const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.in';
  return apiDomain.includes('.in') ? 'https://accounts.zoho.in' : 'https://accounts.zoho.com';
}

try {
  addCheck(result, 'env_presence_masked', 'INFO', envPresence([
    'ZOHO_CLIENT_ID',
    'ZOHO_CLIENT_SECRET',
    'ZOHO_REFRESH_TOKEN',
    'ZOHO_API_DOMAIN',
  ]));

  const required = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    addCheck(result, 'zoho_configured', 'FAIL', { missing });
  } else {
    const tokenRes = await axios.post(`${accountsUrl()}/oauth/v2/token`, null, {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token',
      },
      timeout: 25000,
    });

    const accessToken = tokenRes.data?.access_token;
    addCheck(result, 'zoho_access_token_refresh', accessToken ? 'PASS' : 'FAIL', {
      status: tokenRes.status,
      token_present: Boolean(accessToken),
      response_keys: Object.keys(tokenRes.data || {}),
      error: tokenRes.data?.error || null,
    });

    if (accessToken) {
      const marker = `${TEST_PREFIX}ZOHO_${Date.now()}`;
      const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.in';
      const leadPayload = {
        data: [{
          Last_Name: marker,
          First_Name: 'Audit',
          Company: 'BimaSakhi Audit',
          Email: `test.audit.${Date.now()}@example.com`,
          Phone: '9999999999',
          Lead_Source: 'TEST_AUDIT_LIVE_SYSTEM_AUDIT',
          Description: `${marker} safe audit lead. Can be deleted by CRM admin after verification.`,
        }],
        duplicate_check_fields: ['Email'],
      };

      const crmRes = await axios.post(`${apiDomain}/crm/v2.1/Leads/upsert`, leadPayload, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        timeout: 30000,
      });

      const crmItem = crmRes.data?.data?.[0];
      addCheck(result, 'zoho_test_lead_upsert', crmItem?.status === 'success' ? 'PASS' : 'FAIL', {
        status: crmRes.status,
        crm_status: crmItem?.status || null,
        action: crmItem?.action || null,
        zoho_id_present: Boolean(crmItem?.details?.id),
        marker,
        response_code: crmItem?.code || null,
        message: crmItem?.message || null,
      });
    }
  }
} catch (error) {
  addError(result, 'zoho_unhandled', error);
  addCheck(result, 'zoho_error_response', 'FAIL', {
    status: error?.response?.status || null,
    data: error?.response?.data || null,
    message: error.message,
  });
}

writeResult(finalize(result));

