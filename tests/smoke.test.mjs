/**
 * Smoke Tests — 5 Critical-Path Tests
 * 
 * IMPORTANT: These tests must run against a Vercel deployment (staging or production).
 * The root /api/ routes are a Vercel serverless convention and do NOT resolve
 * during local `next dev`. Always provide the staging URL.
 * 
 * Usage: node tests/smoke.test.mjs <DEPLOYMENT_URL>
 * 
 * Example:
 *   node tests/smoke.test.mjs https://bimasakhi-next-xxxx.vercel.app   # staging
 *   node tests/smoke.test.mjs https://bimasakhi.com                    # production
 * 
 * Exit code: 0 if all pass, 1 if any fail
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function log(status, name, detail = '') {
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${status}: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function test(name, fn) {
    try {
        await fn();
        passed++;
        log('PASS', name);
    } catch (err) {
        failed++;
        log('FAIL', name, err.message);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

// ============================================================
// TEST 1: Health Check
// ============================================================
await test('GET /api/health → 200', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'ok' || data.redis, `Missing expected health fields: ${JSON.stringify(data)}`);
});

// ============================================================
// TEST 2: Pincode Lookup
// ============================================================
await test('GET /api/lookup/pincode?pincode=110001 → valid response', async () => {
    const res = await fetch(`${BASE_URL}/api/lookup/pincode?pincode=110001`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.pincode === '110001', `Expected pincode=110001, got ${data.pincode}`);
    assert(data.state === 'Delhi', `Expected state=Delhi, got ${data.state}`);
    assert(data.eligible === true, `Expected eligible=true, got ${data.eligible}`);
    assert(data.city, `Missing city field`);
});

// ============================================================
// TEST 3: Config Get
// ============================================================
await test('GET /api/admin-data/config-get → config JSON', async () => {
    const res = await fetch(`${BASE_URL}/api/admin-data/config-get`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(typeof data.isAppPaused === 'boolean', `Missing isAppPaused boolean`);
    assert(typeof data.ctaText === 'string', `Missing ctaText string`);
    assert(data.heroTitle, `Missing heroTitle`);
});

// ============================================================
// TEST 4: Admin Login (wrong password)
// ============================================================
await test('POST /api/admin/login (wrong password) → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '__smoke_test_wrong_password__' })
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    const data = await res.json();
    assert(data.error, `Missing error field in response`);
});

// ============================================================
// TEST 5: Create Lead (invalid payload)
// ============================================================
await test('POST /api/crm/create-lead (empty body) → 400', async () => {
    const res = await fetch(`${BASE_URL}/api/crm/create-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error, `Missing error field in response`);
});

// ============================================================
// RESULTS
// ============================================================
console.log(`\n${'═'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${'═'.repeat(40)}`);

if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Fix issues before deploying.');
    process.exit(1);
}

console.log('\n🎉 All smoke tests passed!');
process.exit(0);
