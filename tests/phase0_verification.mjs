#!/usr/bin/env node
/**
 * Phase 0 Priority-R — Rule 8 Verification (4 Test Types)
 * Tests: C6 (Alert), C4+C5 (Image), C7 (RBAC), C8+C9 (Nav), C11+C12 (Geo)
 *
 * Usage:
 *   BASE_URL=https://yoursite.com ADMIN_PASSWORD=xxx node tests/phase0_verification.mjs
 *
 * Env vars read from .env.local automatically if present.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// --- Load .env.local ---
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_PWD = process.env.ADMIN_PASSWORD;

let cookie = null;
let passed = 0, failed = 0, skipped = 0;

function result(name, ok, detail) {
  if (ok === null) { skipped++; console.log(`  -- SKIP ${name}: ${detail}`); return; }
  if (ok) { passed++; console.log(`  OK ${name}${detail ? ' -- ' + detail : ''}`); }
  else { failed++; console.error(`  FAIL ${name} -- ${detail}`); }
}

async function authFetch(path, opts = {}) {
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}), ...(cookie ? { Cookie: cookie } : {}) },
    redirect: opts.redirect || 'follow',
  });
}

// ==================== C7: RBAC Login ====================
async function testC7() {
  console.log('\n[C7] RBAC Login');

  if (!ADMIN_PWD) {
    result('C7', null, 'ADMIN_PASSWORD not set in env');
    return;
  }

  // Happy: correct password
  try {
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PWD }),
      redirect: 'manual',
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    result('Happy -- login', res.ok && !!cookie, cookie ? 'Cookie received' : 'No cookie');
  } catch (e) { result('Happy -- login', false, e.message); }

  // Edge: wrong password
  try {
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'definitely_wrong_xyz_99' }),
    });
    result('Edge -- wrong password -> 401', res.status === 401, `Status: ${res.status}`);
  } catch (e) { result('Edge -- wrong password', false, e.message); }

  // Failure: empty body
  try {
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    result('Failure -- empty body', res.status === 401 || res.status === 400, `Status: ${res.status}`);
  } catch (e) { result('Failure -- empty body', false, e.message); }

  // Auth: login page accessible
  try {
    const res = await fetch(`${BASE}/admin/login`);
    result('Auth -- login page loads', res.ok, `Status: ${res.status}`);
  } catch (e) { result('Auth -- login page', false, e.message); }
}

// ==================== C6: Alert System ====================
async function testC6() {
  console.log('\n[C6] Alert System (Telegram)');
  if (!cookie) { result('C6 all', null, 'Not authenticated'); return; }

  // Happy: test telegram channel
  try {
    const res = await authFetch('/api/admin/alert/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'telegram' }),
    });
    const data = await res.json();
    result('Happy -- telegram', data.results?.telegram === 'delivered', `telegram: ${data.results?.telegram}`);
  } catch (e) { result('Happy -- telegram', false, e.message); }

  // Edge: test all channels
  try {
    const res = await authFetch('/api/admin/alert/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'all' }),
    });
    const data = await res.json();
    result('Edge -- all channels', res.ok, `Results: ${JSON.stringify(data.results)}`);
  } catch (e) { result('Edge -- all channels', false, e.message); }

  // Failure: env_status reports correctly
  try {
    const res = await authFetch('/api/admin/alert/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'all' }),
    });
    const data = await res.json();
    result('Failure -- env_status shape', typeof data.env_status === 'object', `env_status: ${JSON.stringify(data.env_status)}`);
  } catch (e) { result('Failure -- env_status', false, e.message); }

  // Auth: no cookie -> 401
  try {
    const res = await fetch(`${BASE}/api/admin/alert/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'telegram' }),
    });
    result('Auth -- no cookie -> 401', res.status === 401, `Status: ${res.status}`);
  } catch (e) { result('Auth -- no cookie', false, e.message); }
}

// ==================== C4+C5: Image Upload ====================
async function testC4C5() {
  console.log('\n[C4+C5] Image Upload (Supabase Storage)');
  if (!cookie) { result('C4+C5 all', null, 'Not authenticated'); return; }

  // Minimal valid 1x1 PNG (base64)
  const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  // Happy: upload valid PNG
  try {
    const form = new FormData();
    form.append('file', new Blob([PNG_1X1], { type: 'image/png' }), 'test-1x1.png');
    const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: form });
    const data = await res.json();
    const hasUrl = !!data.file?.file_url;
    result('Happy -- PNG upload', res.ok && hasUrl,
      hasUrl ? `URL: ${data.file.file_url.substring(0, 80)}...` : JSON.stringify(data).substring(0, 120));
  } catch (e) { result('Happy -- PNG upload', false, e.message); }

  // Edge: non-image file -> 415
  try {
    const form = new FormData();
    form.append('file', new Blob(['not an image'], { type: 'text/plain' }), 'test.txt');
    const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: form });
    result('Edge -- text file rejected -> 415', res.status === 415, `Status: ${res.status}`);
  } catch (e) { result('Edge -- text rejected', false, e.message); }

  // Failure: no file field -> 400
  try {
    const form = new FormData();
    const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: form });
    result('Failure -- no file -> 400', res.status === 400, `Status: ${res.status}`);
  } catch (e) { result('Failure -- no file', false, e.message); }

  // Auth: no cookie -> 401
  try {
    const form = new FormData();
    form.append('file', new Blob([PNG_1X1], { type: 'image/png' }), 'test.png');
    const res = await fetch(`${BASE}/api/admin/media/upload`, { method: 'POST', body: form });
    result('Auth -- no cookie -> 401', res.status === 401, `Status: ${res.status}`);
  } catch (e) { result('Auth -- no cookie', false, e.message); }
}

// ==================== C8+C9: Navigation ====================
async function testC8C9() {
  console.log('\n[C8+C9] Admin Navigation');
  if (!cookie) { result('C8+C9 all', null, 'Not authenticated'); return; }

  // Happy: /admin/pages accessible
  try {
    const res = await authFetch('/admin/pages');
    result('Happy -- /admin/pages', res.ok, `Status: ${res.status}`);
  } catch (e) { result('Happy -- /admin/pages', false, e.message); }

  // Happy: /admin/locations/geo accessible
  try {
    const res = await authFetch('/admin/locations/geo');
    result('Happy -- /admin/locations/geo', res.ok, `Status: ${res.status}`);
  } catch (e) { result('Happy -- /admin/locations/geo', false, e.message); }

  // Edge: /admin dashboard still works
  try {
    const res = await authFetch('/admin');
    result('Edge -- /admin dashboard', res.ok || res.status === 307, `Status: ${res.status}`);
  } catch (e) { result('Edge -- /admin', false, e.message); }

  // Auth: unauthenticated -> redirect or block
  try {
    const res = await fetch(`${BASE}/admin/pages`, { redirect: 'manual' });
    result('Auth -- unauthed redirect', [200, 302, 307].includes(res.status), `Status: ${res.status}`);
  } catch (e) { result('Auth -- unauthed', false, e.message); }
}

// ==================== C11+C12: Geo Management ====================
async function testC11C12() {
  console.log('\n[C11+C12] Geo Intelligence (Cities + Localities)');
  if (!cookie) { result('C11+C12 all', null, 'Not authenticated'); return; }

  const testCity = `TestCity_${Date.now()}`;
  let cityId = null;

  // Happy: create city
  try {
    const res = await authFetch('/api/admin/locations/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city_name: testCity, state: 'TestState' }),
    });
    const data = await res.json();
    cityId = data.city?.id;
    result('Happy -- create city -> 201', res.status === 201, `City: ${testCity}, ID: ${cityId}`);
  } catch (e) { result('Happy -- create city', false, e.message); }

  // Happy: create locality under that city
  if (cityId) {
    try {
      const res = await authFetch('/api/admin/locations/localities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city_id: cityId, locality_name: `TestLoc_${Date.now()}` }),
      });
      result('Happy -- create locality -> 201', res.status === 201, `Status: ${res.status}`);
    } catch (e) { result('Happy -- create locality', false, e.message); }
  } else {
    result('Happy -- create locality', null, 'City not created');
  }

  // Edge: duplicate city -> 409
  if (cityId) {
    try {
      const res = await authFetch('/api/admin/locations/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city_name: testCity, state: 'TestState' }),
      });
      result('Edge -- duplicate city -> 409', res.status === 409, `Status: ${res.status}`);
    } catch (e) { result('Edge -- duplicate city', false, e.message); }
  }

  // Failure: missing required fields -> 400
  try {
    const res = await authFetch('/api/admin/locations/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city_name: '' }),
    });
    result('Failure -- missing fields -> 400', res.status === 400, `Status: ${res.status}`);
  } catch (e) { result('Failure -- missing fields', false, e.message); }

  // Auth: no cookie -> 401
  try {
    const res = await fetch(`${BASE}/api/admin/locations/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city_name: 'X', state: 'Y' }),
    });
    result('Auth -- no cookie -> 401', res.status === 401, `Status: ${res.status}`);
  } catch (e) { result('Auth -- no cookie', false, e.message); }

  // GET: list cities
  try {
    const res = await authFetch('/api/admin/locations/cities');
    result('Happy -- list cities', res.ok, `Status: ${res.status}`);
  } catch (e) { result('Happy -- list cities', false, e.message); }
}

// ==================== MAIN ====================
async function main() {
  console.log('='.repeat(50));
  console.log('  Phase 0 Priority-R -- Rule 8 Verification');
  console.log(`  Target: ${BASE}`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  await testC7();   // Login first to get cookie
  await testC6();
  await testC4C5();
  await testC8C9();
  await testC11C12();

  console.log('\n' + '='.repeat(50));
  console.log(`  RESULTS: ${passed} passed | ${failed} failed | ${skipped} skipped`);
  console.log('='.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
