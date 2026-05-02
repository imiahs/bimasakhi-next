import bcrypt from 'bcryptjs';
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
  writeResult,
} from './_auditUtils.mjs';

loadEnv();

const result = makeResult('p0-3-role-access-control-proof');
const supabase = getServiceSupabase();

const TEST_PASSWORD = 'P0.3_Audit!234';
const TEST_USERS = [
  { role: 'admin', email: 'p0-3.audit.admin@bimasakhi.com', name: 'P0.3 Audit Admin' },
  { role: 'editor', email: 'p0-3.audit.editor@bimasakhi.com', name: 'P0.3 Audit Editor' },
  { role: 'agent', email: 'p0-3.audit.agent@bimasakhi.com', name: 'P0.3 Audit Agent' },
];

const ACCESS_PROBES = [
  {
    key: 'profile',
    pagePath: '/admin/profile',
    apiPath: '/api/admin/check',
    pageRoles: ['super_admin', 'admin', 'editor', 'agent'],
    apiRoles: ['super_admin', 'admin', 'editor', 'agent'],
    deniedRedirects: {},
  },
  {
    key: 'dashboard',
    pagePath: '/admin',
    apiPath: '/api/admin/dashboard',
    pageRoles: ['super_admin'],
    apiRoles: ['super_admin'],
    deniedRedirects: {
      admin: '/admin/crm',
      editor: '/admin/ccc',
      agent: '/admin/profile',
    },
  },
  {
    key: 'content',
    pagePath: '/admin/ccc',
    apiPath: '/api/admin/ccc/drafts',
    pageRoles: ['super_admin', 'admin', 'editor'],
    apiRoles: ['super_admin', 'admin', 'editor'],
    deniedRedirects: {
      agent: '/admin/profile',
    },
  },
  {
    key: 'crm',
    pagePath: '/admin/crm',
    apiPath: '/api/admin/leads',
    pageRoles: ['super_admin', 'admin'],
    apiRoles: ['super_admin', 'admin'],
    deniedRedirects: {
      editor: '/admin/ccc',
      agent: '/admin/profile',
    },
  },
  {
    key: 'locations',
    pagePath: '/admin/locations/geo',
    apiPath: '/api/admin/locations/coverage',
    pageRoles: ['super_admin', 'admin', 'editor'],
    apiRoles: ['super_admin', 'admin', 'editor'],
    deniedRedirects: {
      agent: '/admin/profile',
    },
  },
  {
    key: 'analytics',
    pagePath: '/admin/analytics',
    apiPath: '/api/admin/metrics',
    pageRoles: ['super_admin', 'admin'],
    apiRoles: ['super_admin', 'admin'],
    deniedRedirects: {
      editor: '/admin/ccc',
      agent: '/admin/profile',
    },
  },
  {
    key: 'navigation',
    pagePath: '/admin/navigation',
    apiPath: '/api/admin/navigation?menu=public_header',
    pageRoles: ['super_admin'],
    apiRoles: ['super_admin'],
    deniedRedirects: {
      admin: '/admin/crm',
      editor: '/admin/ccc',
      agent: '/admin/profile',
    },
  },
  {
    key: 'feature_flags',
    pagePath: '/admin/control/features',
    apiPath: '/api/admin/feature-flags',
    pageRoles: ['super_admin'],
    apiRoles: ['super_admin'],
    deniedRedirects: {
      admin: '/admin/crm',
      editor: '/admin/ccc',
      agent: '/admin/profile',
    },
  },
  {
    key: 'workflow',
    pagePath: '/admin/control/workflow',
    apiPath: '/api/admin/workflow-config',
    pageRoles: ['super_admin'],
    apiRoles: ['super_admin'],
    deniedRedirects: {
      admin: '/admin/crm',
      editor: '/admin/ccc',
      agent: '/admin/profile',
    },
  },
  {
    key: 'users',
    pagePath: '/admin/users',
    apiPath: '/api/admin/users',
    pageRoles: ['super_admin'],
    apiRoles: ['super_admin'],
    deniedRedirects: {
      admin: '/admin/crm',
      editor: '/admin/ccc',
      agent: '/admin/profile',
    },
  },
  {
    key: 'system',
    pagePath: '/admin/system/code',
    apiPath: '/api/admin/system/code',
    pageRoles: ['super_admin'],
    apiRoles: ['super_admin'],
    deniedRedirects: {
      admin: '/admin/crm',
      editor: '/admin/ccc',
      agent: '/admin/profile',
    },
  },
];

function getArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function getBooleanArg(name, fallback = false) {
  const value = getArg(name, null);
  if (value == null) {
    return fallback;
  }

  return value === '1' || value === 'true' || value === 'yes';
}

function normalizeCookie(headers) {
  const raw = headers.get('set-cookie');
  return raw ? raw.split(';')[0].trim() : '';
}

function normalizeLocation(locationHeader) {
  if (!locationHeader) {
    return null;
  }

  try {
    return new URL(locationHeader).pathname + new URL(locationHeader).search;
  } catch {
    return locationHeader;
  }
}

async function request(baseUrl, path, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL(path, baseUrl), {
      ...options,
      signal: controller.signal,
    });

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
      headers: response.headers,
      body,
      location: normalizeLocation(response.headers.get('location')),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function deleteAuditUsers() {
  const { error } = await supabase
    .from('admin_users')
    .delete()
    .in('email', TEST_USERS.map((user) => user.email));

  if (error) {
    throw error;
  }
}

async function seedAuditUsers() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const rows = TEST_USERS.map((user) => ({
    email: user.email,
    name: user.name,
    role: user.role,
    password_hash: passwordHash,
    is_active: true,
  }));

  const { error } = await supabase
    .from('admin_users')
    .insert(rows);

  if (error) {
    throw error;
  }
}

async function fetchRoleInventory() {
  const { data, error } = await supabase
    .from('admin_users')
    .select('email, role, is_active');

  if (error) {
    throw error;
  }

  return (data || []).reduce((inventory, row) => {
    if (TEST_USERS.some((user) => user.email === row.email)) {
      return inventory;
    }

    if (!inventory[row.role]) {
      inventory[row.role] = { total: 0, active: 0 };
    }

    inventory[row.role].total += 1;
    if (row.is_active) {
      inventory[row.role].active += 1;
    }

    return inventory;
  }, {});
}

async function login(baseUrl, email, password) {
  const response = await request(baseUrl, '/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: baseUrl,
    },
    body: JSON.stringify({ email, password }),
  });

  return {
    ...response,
    cookie: normalizeCookie(response.headers),
  };
}

async function pageProbe(baseUrl, cookie, path) {
  return request(baseUrl, path, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      Cookie: cookie,
      Origin: baseUrl,
    },
  });
}

async function apiProbe(baseUrl, cookie, path) {
  return request(baseUrl, path, {
    method: 'GET',
    headers: {
      Cookie: cookie,
      Origin: baseUrl,
    },
  });
}

function summarizeProbe(role, probe, pageResponse, apiResponse) {
  return {
    role,
    module: probe.key,
    page: {
      path: probe.pagePath,
      status: pageResponse.status,
      location: pageResponse.location,
    },
    api: {
      path: probe.apiPath,
      status: apiResponse.status,
      error: typeof apiResponse.body === 'object' ? apiResponse.body?.error || null : null,
    },
  };
}

try {
  const baseUrl = getArg('baseUrl', canonicalBaseUrl());
  const expectedVersion = getArg('expected-version', null);
  const keepUsers = getBooleanArg('keep-users', false);
  const cleanupOnly = getBooleanArg('cleanup-only', false);

  addCheck(result, 'env_presence_masked', 'INFO', envPresence([
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]));

  await deleteAuditUsers();
  addCheck(result, 'audit_user_cleanup_start', 'PASS', {
    emails: TEST_USERS.map((user) => user.email),
  });

  if (cleanupOnly) {
    addCheck(result, 'cleanup_only', 'PASS', { keep_users: false });
    finalize(result);
    writeResult(result);
    process.exit(0);
  }

  const roleInventory = await fetchRoleInventory();
  addCheck(result, 'current_role_inventory', 'INFO', roleInventory);

  const statusResponse = await request(baseUrl, '/api/status');
  addCheck(result, 'deployment_status', statusResponse.ok && (!expectedVersion || statusResponse.body?.version === expectedVersion) ? 'PASS' : 'FAIL', {
    status: statusResponse.status,
    observed_version: statusResponse.body?.version || null,
    expected_version: expectedVersion,
    environment: statusResponse.body?.environment || null,
  });

  const superAdminLogin = await login(baseUrl, adminLoginPayload().email, adminLoginPayload().password);
  addCheck(result, 'super_admin_login', superAdminLogin.ok && Boolean(superAdminLogin.cookie) ? 'PASS' : 'FAIL', {
    status: superAdminLogin.status,
    role: superAdminLogin.body?.role || null,
    cookie_present: Boolean(superAdminLogin.cookie),
  });

  if (!superAdminLogin.ok || !superAdminLogin.cookie) {
    throw new Error('Super admin login failed.');
  }

  await seedAuditUsers();
  addCheck(result, 'audit_users_seeded', 'PASS', {
    roles: TEST_USERS.map((user) => user.role),
    emails: TEST_USERS.map((user) => user.email),
  });

  const roleSessions = {
    super_admin: superAdminLogin.cookie,
  };

  for (const user of TEST_USERS) {
    const auth = await login(baseUrl, user.email, TEST_PASSWORD);
    addCheck(result, `login_${user.role}`, auth.ok && Boolean(auth.cookie) ? 'PASS' : 'FAIL', {
      status: auth.status,
      role: auth.body?.role || null,
      cookie_present: Boolean(auth.cookie),
    });

    if (!auth.ok || !auth.cookie) {
      throw new Error(`Login failed for role ${user.role}.`);
    }

    roleSessions[user.role] = auth.cookie;
  }

  const probeResults = [];

  for (const probe of ACCESS_PROBES) {
    for (const role of ['super_admin', 'admin', 'editor', 'agent']) {
      const pageResponse = await pageProbe(baseUrl, roleSessions[role], probe.pagePath);
      const apiResponse = await apiProbe(baseUrl, roleSessions[role], probe.apiPath);
      probeResults.push(summarizeProbe(role, probe, pageResponse, apiResponse));
    }
  }

  const happyFlow = probeResults.filter((entry) => {
    const pageAllowed = ACCESS_PROBES.find((probe) => probe.key === entry.module)?.pageRoles.includes(entry.role);
    const apiAllowed = ACCESS_PROBES.find((probe) => probe.key === entry.module)?.apiRoles.includes(entry.role);
    return pageAllowed && apiAllowed;
  });

  const deniedFlow = probeResults.filter((entry) => {
    const probe = ACCESS_PROBES.find((item) => item.key === entry.module);
    return probe && (!probe.pageRoles.includes(entry.role) || !probe.apiRoles.includes(entry.role));
  });

  const happyFlowPass = happyFlow.every((entry) => entry.page.status === 200 && entry.api.status === 200);
  addCheck(result, 'happy_flow_correct_access', happyFlowPass ? 'PASS' : 'FAIL', {
    checked_pairs: happyFlow.length,
    failures: happyFlow.filter((entry) => entry.page.status !== 200 || entry.api.status !== 200),
  });

  const deniedFailures = deniedFlow.filter((entry) => {
    const probe = ACCESS_PROBES.find((item) => item.key === entry.module);
    const expectedRedirect = probe?.deniedRedirects?.[entry.role] || '/admin/login';
    const pageDenied = probe?.pageRoles.includes(entry.role) ? entry.page.status === 200 : entry.page.status === 307 && String(entry.page.location || '').includes(expectedRedirect);
    const apiDenied = probe?.apiRoles.includes(entry.role) ? entry.api.status === 200 : entry.api.status === 403;
    return !pageDenied || !apiDenied;
  });

  addCheck(result, 'edge_unauthorized_access_blocked', deniedFailures.length === 0 ? 'PASS' : 'FAIL', {
    checked_pairs: deniedFlow.length,
    failures: deniedFailures,
  });

  const invalidApi = await request(baseUrl, '/api/admin/check', {
    method: 'GET',
    headers: {
      Cookie: 'admin_session=invalid',
      Origin: baseUrl,
    },
  });
  const invalidPage = await request(baseUrl, '/admin/profile', {
    method: 'GET',
    redirect: 'manual',
    headers: {
      Cookie: 'admin_session=invalid',
      Origin: baseUrl,
    },
  });

  addCheck(result, 'failure_invalid_session', invalidApi.status === 401 && invalidPage.status === 307 && String(invalidPage.location || '').includes('/admin/login') ? 'PASS' : 'FAIL', {
    api_status: invalidApi.status,
    page_status: invalidPage.status,
    page_location: invalidPage.location,
  });

  const concurrentRequests = [];
  for (let iteration = 0; iteration < 3; iteration += 1) {
    concurrentRequests.push(apiProbe(baseUrl, roleSessions.super_admin, '/api/admin/users'));
    concurrentRequests.push(apiProbe(baseUrl, roleSessions.admin, '/api/admin/leads'));
    concurrentRequests.push(apiProbe(baseUrl, roleSessions.editor, '/api/admin/ccc/drafts'));
    concurrentRequests.push(apiProbe(baseUrl, roleSessions.agent, '/api/admin/check'));
  }

  const concurrentResults = await Promise.all(concurrentRequests);
  addCheck(result, 'load_multiple_role_sessions', concurrentResults.every((response) => response.status === 200) ? 'PASS' : 'FAIL', {
    total_requests: concurrentResults.length,
    statuses: concurrentResults.map((response) => response.status),
  });

  addCheck(result, 'page_api_probe_matrix', deniedFailures.length === 0 && happyFlowPass ? 'PASS' : 'FAIL', {
    probes: probeResults,
  });

  addCheck(result, 'access_model_snapshot', 'INFO', {
    roles: ['super_admin', 'admin', 'editor', 'agent'],
    modules: ACCESS_PROBES.map((probe) => ({
      module: probe.key,
      page_path: probe.pagePath,
      api_path: probe.apiPath,
      view_roles: probe.pageRoles,
      api_roles: probe.apiRoles,
    })),
  });
} catch (error) {
  addError(result, 'audit_runtime', error);
} finally {
  if (!getBooleanArg('keep-users', false)) {
    try {
      await deleteAuditUsers();
      addCheck(result, 'audit_user_cleanup_finish', 'PASS', {
        emails: TEST_USERS.map((user) => user.email),
      });
    } catch (cleanupError) {
      addError(result, 'audit_user_cleanup_finish', cleanupError);
    }
  }

  finalize(result);
  writeResult(result);
}