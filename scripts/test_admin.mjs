/**
 * PHASE 9: Admin Panel Validation
 * Test: actions API, ops dashboard, timeline, consistency view
 * 
 * Usage: node --env-file=.env.local scripts/test_admin.mjs
 */

import { SignJWT } from 'jose';

const BASE_URL = 'https://bimasakhi.com';

// Login and get admin session cookie
let adminCookie = null;
async function ensureLogin() {
    if (adminCookie) return;
    const resp = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
    });
    if (resp.status !== 200) throw new Error(`Login failed: ${resp.status}`);
    const setCookie = resp.headers.getSetCookie();
    adminCookie = setCookie[0].split(';')[0];
}

async function adminGet(path) {
    await ensureLogin();
    const resp = await fetch(`${BASE_URL}${path}`, {
        headers: {
            'Accept': 'application/json',
            'Cookie': adminCookie,
        },
    });
    return { status: resp.status, data: await resp.json().catch(() => null) };
}

async function adminPost(path, body) {
    await ensureLogin();
    const resp = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': adminCookie,
        },
        body: JSON.stringify(body),
    });
    return { status: resp.status, data: await resp.json().catch(() => null) };
}

async function main() {
    console.log('═══ PHASE 9: ADMIN PANEL VALIDATION ═══\n');

    const tests = [];

    // Test 1: Ops Dashboard
    console.log('Test 1: Ops Dashboard...');
    const dashboard = await adminGet('/api/admin/ops-dashboard');
    console.log(`  Status: ${dashboard.status}`);
    if (dashboard.status === 200 && dashboard.data) {
        const d = dashboard.data;
        console.log(`  Health: ${d.health}`);
        console.log(`  System mode: ${d.system_mode}`);
        console.log(`  Events/min: ${d.events_per_minute}`);
        console.log(`  Active alerts: ${d.active_alerts}`);
        console.log(`  Dead letters 24h: ${d.dead_letters_24h}`);
        tests.push({ name: 'Ops Dashboard', pass: true });
    } else {
        console.log(`  Data: ${JSON.stringify(dashboard.data)?.substring(0, 200)}`);
        tests.push({ name: 'Ops Dashboard', pass: false });
    }

    // Test 2: Admin Actions — Event Store view
    console.log('\nTest 2: Event Store View...');
    const eventStoreView = await adminGet('/api/admin/actions?view=event_store');
    console.log(`  Status: ${eventStoreView.status}`);
    if (eventStoreView.status === 200) {
        const count = eventStoreView.data?.data?.length || 0;
        console.log(`  Events found: ${count}`);
        tests.push({ name: 'Event Store View', pass: true });
    } else {
        console.log(`  Error: ${JSON.stringify(eventStoreView.data)?.substring(0, 200)}`);
        tests.push({ name: 'Event Store View', pass: false });
    }

    // Test 3: Admin Actions — Timeline view (requires lead_id)
    console.log('\nTest 3: Timeline View...');
    // Get a lead_id from event store first
    const sampleEvent = eventStoreView.data?.data?.[0];
    const leadId = sampleEvent?.lead_id;
    const timelinePath = leadId 
        ? `/api/admin/actions?view=timeline&lead_id=${leadId}`
        : '/api/admin/actions?view=timeline&lead_id=00000000-0000-0000-0000-000000000000';
    const timeline = await adminGet(timelinePath);
    console.log(`  Status: ${timeline.status}`);
    if (timeline.status === 200) {
        const count = timeline.data?.data?.length || 0;
        console.log(`  Timeline entries: ${count}`);
        tests.push({ name: 'Timeline View', pass: true });
    } else {
        console.log(`  Error: ${JSON.stringify(timeline.data)?.substring(0, 200)}`);
        tests.push({ name: 'Timeline View', pass: false });
    }

    // Test 4: Admin Actions — Consistency view
    console.log('\nTest 4: Consistency View...');
    const consistency = await adminGet('/api/admin/actions?view=consistency');
    console.log(`  Status: ${consistency.status}`);
    if (consistency.status === 200) {
        const d = consistency.data?.data;
        if (d) {
            console.log(`  Stuck leads: ${d.stuck_leads?.length || 0}`);
            console.log(`  Zoho mismatch: ${d.zoho_mismatch?.length || 0}`);
            console.log(`  Partial scoring: ${d.partial_scoring?.length || 0}`);
        }
        tests.push({ name: 'Consistency View', pass: true });
    } else {
        console.log(`  Error: ${JSON.stringify(consistency.data)?.substring(0, 200)}`);
        tests.push({ name: 'Consistency View', pass: false });
    }

    // Test 5: Admin Actions — Event Store Stats
    console.log('\nTest 5: Event Store Stats...');
    const stats = await adminGet('/api/admin/actions?view=event_store_stats');
    console.log(`  Status: ${stats.status}`);
    if (stats.status === 200) {
        const d = stats.data?.data;
        console.log(`  Total events: ${d?.total || 0}`);
        console.log(`  Completion rate: ${d?.completion_rate || 'n/a'}%`);
        tests.push({ name: 'Event Store Stats', pass: true });
    } else {
        console.log(`  Error: ${JSON.stringify(stats.data)?.substring(0, 200)}`);
        tests.push({ name: 'Event Store Stats', pass: false });
    }

    // Test 6: Admin Actions — Metrics view
    console.log('\nTest 6: Metrics View...');
    const metrics = await adminGet('/api/admin/actions?view=metrics');
    console.log(`  Status: ${metrics.status}`);
    if (metrics.status === 200) {
        tests.push({ name: 'Metrics View', pass: true });
    } else {
        console.log(`  Error: ${JSON.stringify(metrics.data)?.substring(0, 200)}`);
        tests.push({ name: 'Metrics View', pass: false });
    }

    // Summary
    const passed = tests.filter(t => t.pass).length;
    console.log('\n═══ ADMIN PANEL RESULTS ═══');
    tests.forEach(t => console.log(`  ${t.pass ? '✓' : '✗'} ${t.name}`));
    console.log(`\n  VERDICT: ${passed}/${tests.length} PASS`);
}

main().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
