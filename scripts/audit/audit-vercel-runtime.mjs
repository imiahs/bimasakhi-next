import { addCheck, addError, adminLoginPayload, canonicalBaseUrl, envPresence, fetchWithTimeout, finalize, loadEnv, makeResult, writeResult } from './_auditUtils.mjs';

loadEnv();
const result = makeResult('vercel-runtime');

try {
  addCheck(result, 'env_presence_masked', 'INFO', envPresence([
    'NEXT_PUBLIC_SITE_URL',
    'ADMIN_PASSWORD',
    'JWT_SECRET',
    'SUPABASE_URL',
    'QSTASH_TOKEN',
  ]));

  const baseUrl = canonicalBaseUrl();
  addCheck(result, 'base_url', 'INFO', { baseUrl });

  const routes = [
    { name: 'status', url: `${baseUrl}/api/status`, expectJson: true },
    { name: 'test_get', url: `${baseUrl}/api/test`, expectJson: true },
    { name: 'navigation', url: `${baseUrl}/api/navigation`, expectJson: true },
    { name: 'sitemap_xml', url: `${baseUrl}/sitemap.xml`, expectJson: false },
    { name: 'home', url: `${baseUrl}/`, expectJson: false },
    { name: 'why', url: `${baseUrl}/why`, expectJson: false },
  ];

  for (const route of routes) {
    try {
      const response = await fetchWithTimeout(route.url, {}, 25000);
      const evidence = {
        url: route.url,
        status: response.status,
        ok: response.ok,
        body_sample: typeof response.body === 'string' ? response.body.slice(0, 240) : response.body,
      };
      addCheck(result, `route_${route.name}`, response.ok ? 'PASS' : 'FAIL', evidence);
    } catch (error) {
      addError(result, `route_${route.name}`, error);
      addCheck(result, `route_${route.name}`, 'FAIL', { url: route.url, error: error.message });
    }
  }

  if (process.env.ADMIN_PASSWORD) {
    try {
      const login = await fetchWithTimeout(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: baseUrl },
        body: JSON.stringify(adminLoginPayload()),
      }, 25000);
      const cookiePresent = Boolean(login.headers['set-cookie']);
      addCheck(result, 'admin_login_runtime', login.ok && cookiePresent ? 'PASS' : 'FAIL', {
        status: login.status,
        ok: login.ok,
        cookie_present: cookiePresent,
        body: login.body,
      });
    } catch (error) {
      addError(result, 'admin_login_runtime', error);
    }
  } else {
    addCheck(result, 'admin_login_runtime', 'INFO', { skipped: true, reason: 'ADMIN_PASSWORD missing locally' });
  }
} catch (error) {
  addError(result, 'vercel_runtime_unhandled', error);
}

writeResult(finalize(result));

