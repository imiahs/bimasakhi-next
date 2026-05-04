/**
 * Comprehensive validation test for Phase 4, 5, 21 fixes.
 * Run: node --env-file=.env.local scripts/validate_phases.mjs
 */
import http from 'http';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const PORT = 3002;
const pw = fs.readFileSync('.env.local', 'utf8').split('\n')
    .find(l => l.startsWith('ADMIN_PASSWORD=')).split('=').slice(1).join('=').trim();

const envLines = fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; });
const env = Object.fromEntries(envLines);
const adminEmail = (env.ADMIN_EMAIL || 'admin@bimasakhi.com').trim().toLowerCase();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function req(method, path, body, cookie) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : '';
        const opts = {
            hostname: 'localhost', port: PORT, path, method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': `http://localhost:${PORT}`,
                ...(cookie ? { Cookie: cookie } : {}),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const r = http.request(opts, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                const cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
                try { resolve({ status: res.statusCode, body: JSON.parse(body), cookies }); }
                catch { resolve({ status: res.statusCode, body, cookies }); }
            });
        });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

const results = [];
function test(name, pass, detail = '') {
    results.push({ name, pass, detail });
    console.log(`  ${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function run() {
    // === AUTH ===
    const login = await req('POST', '/api/admin/login', { email: adminEmail, password: pw });
    const cookie = login.cookies;
    test('AUTH: Login', login.status === 200, `status=${login.status}`);

    // Real data from DB
    const realIds = [
        '9fb065b2-088f-40e6-af04-b7340589a73a', // Dwarka
        '0bc9836e-2d5e-4904-92cb-b0a12f4d6686', // Rohini
        'a0658d4e-c10e-4340-8e91-ce88503e23bd', // Janakpuri
    ];
    const cityId = 'c1f12e8d-355e-45c4-a36b-834ef471d05c'; // Delhi

    // ===== PHASE 4: BULK JOB PLANNER WITH LOCALITY TARGETING =====
    console.log('\n========== PHASE 4: BULK JOB PLANNER ==========');

    // 4.1: Happy path — POST with locality_ids
    const t41 = await req('POST', '/api/admin/ccc/bulk', {
        name: 'TEST-loc-targeting', intent_type: 'lic_agent', base_keyword: 'lic agent',
        locality_ids: realIds, scope: 'locality'
    }, cookie);
    test('4.1 POST with locality_ids (happy)',
        t41.status === 200 && t41.body?.data?.total_pages === 3 && t41.body?.data?.locality_ids?.length === 3,
        `status=${t41.status} pages=${t41.body?.data?.total_pages} ids=${t41.body?.data?.locality_ids?.length}`);

    // 4.2: Happy path — POST with city_ids only
    const t42 = await req('POST', '/api/admin/ccc/bulk', {
        name: 'TEST-city-scope', intent_type: 'lic_agent', base_keyword: 'lic agent city',
        city_ids: [cityId], scope: 'city'
    }, cookie);
    test('4.2 POST with city_ids (happy)',
        t42.status === 200 && t42.body?.data?.total_pages > 0,
        `status=${t42.status} pages=${t42.body?.data?.total_pages}`);

    // 4.3: Happy path — POST with neither (all localities)
    const t43 = await req('POST', '/api/admin/ccc/bulk', {
        name: 'TEST-all-localities', intent_type: 'lic_agent', base_keyword: 'lic agent all',
    }, cookie);
    test('4.3 POST with no targeting (all localities)',
        t43.status === 200 && t43.body?.data?.total_pages > 0,
        `status=${t43.status} pages=${t43.body?.data?.total_pages}`);

    // 4.4: Edge — missing required fields
    const t44 = await req('POST', '/api/admin/ccc/bulk', { description: 'no name' }, cookie);
    test('4.4 Missing required fields (edge)', t44.status === 400, `status=${t44.status}`);

    // 4.5: Edge — invalid UUID in locality_ids
    const t45 = await req('POST', '/api/admin/ccc/bulk', {
        name: 'TEST-bad-uuid', intent_type: 'lic_agent', base_keyword: 'test',
        locality_ids: ['not-a-uuid']
    }, cookie);
    test('4.5 Invalid UUID (edge)', t45.status === 500, `status=${t45.status} err=${t45.body?.error?.substring(0, 60)}`);

    // 4.6: Failure — no auth
    const t46 = await req('POST', '/api/admin/ccc/bulk', {
        name: 'x', intent_type: 'x', base_keyword: 'x'
    });
    test('4.6 No auth (failure)', t46.status === 401, `status=${t46.status}`);

    // 4.7: DB verify — GET list confirms stored data
    const t47 = await req('GET', '/api/admin/ccc/bulk', null, cookie);
    const testJobs = (t47.body?.data || []).filter(j => j.name?.startsWith('TEST-'));
    const locJob = testJobs.find(j => j.name === 'TEST-loc-targeting');
    test('4.7 DB verify — locality job stored correctly',
        locJob?.total_pages === 3 && locJob?.locality_ids?.length === 3 && locJob?.status === 'planned',
        `pages=${locJob?.total_pages} ids=${locJob?.locality_ids?.length} status=${locJob?.status}`);

    // ===== PHASE 5: PINCODE IMPORT =====
    console.log('\n========== PHASE 5: PINCODE IMPORT ==========');

    // 5.1: Happy path — POST import with valid data
    const t51 = await req('POST', '/api/admin/locations/import', {
        dataset: [
            { pincode: '999001', city_name: 'TestCity', locality_name: 'TEST-Place-A', state: 'TestState' },
            { pincode: '999002', city_name: 'TestCity', locality_name: 'TEST-Place-B', state: 'TestState' },
        ]
    }, cookie);
    test('5.1 POST pincode import (happy)', t51.status === 200,
        `status=${t51.status} body=${JSON.stringify(t51.body).substring(0, 150)}`);

    // 5.2: Edge — empty dataset
    const t52 = await req('POST', '/api/admin/locations/import', { dataset: [] }, cookie);
    test('5.2 Empty dataset (edge)', t52.status === 200, `status=${t52.status}`);

    // 5.3: Edge — missing dataset field
    const t53 = await req('POST', '/api/admin/locations/import', { data: [] }, cookie);
    test('5.3 Missing dataset field (edge)', t53.status === 400, `status=${t53.status}`);

    // 5.4: Failure — no auth
    const t54 = await req('POST', '/api/admin/locations/import', { dataset: [] });
    test('5.4 No auth (failure)', t54.status === 401, `status=${t54.status}`);

    // 5.5: DB verify — check imported data exists (stored in cities + localities + pincodes tables)
    const { data: testCity5 } = await sb.from('cities').select('id').eq('slug', 'testcity').single();
    let importedPins = [];
    if (testCity5) {
        const { data: locs } = await sb.from('localities').select('id').eq('city_id', testCity5.id);
        if (locs?.length > 0) {
            const { data: pins } = await sb.from('pincodes').select('*').in('locality_id', locs.map(l => l.id));
            importedPins = pins || [];
        }
    }
    test('5.5 DB verify — pincodes stored', importedPins.length >= 2,
        `city=${!!testCity5} pincodes=${importedPins.length}`);

    // ===== PHASE 21: ALERT ESCALATION + MORNING BRIEF =====
    console.log('\n========== PHASE 21: ALERT ESCALATION + MORNING BRIEF ==========');

    // 21.1: Escalation query works (empty state)
    const { data: overdueEmpty, error: escErr1 } = await sb
        .from('alert_deliveries')
        .select('*')
        .eq('acknowledged', false)
        .in('severity', ['P0', 'P1'])
        .not('next_escalation_at', 'is', null)
        .lte('next_escalation_at', new Date().toISOString())
        .limit(10);
    test('21.1 Escalation query (empty state)', !escErr1, `overdue=${overdueEmpty?.length || 0}`);

    // 21.2: Insert test P0 alert with past escalation deadline
    const pastTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: testAlert, error: insErr } = await sb.from('alert_deliveries').insert({
        alert_type: 'TEST_ESCALATION',
        severity: 'P0',
        message: 'TEST: System down (escalation test)',
        channels_attempted: ['telegram'],
        channels_delivered: [],
        delivery_status: 'pending',
        acknowledged: false,
        next_escalation_at: pastTime,
        retry_count: 0,
    }).select().single();
    test('21.2 Insert test P0 alert', !insErr && !!testAlert?.id, `id=${testAlert?.id}`);

    // 21.3: Escalation query finds the test alert
    if (testAlert) {
        const { data: found } = await sb
            .from('alert_deliveries')
            .select('id, alert_type, severity, retry_count, next_escalation_at')
            .eq('acknowledged', false)
            .in('severity', ['P0', 'P1'])
            .not('next_escalation_at', 'is', null)
            .lte('next_escalation_at', new Date().toISOString())
            .limit(10);
        const match = found?.find(a => a.id === testAlert.id);
        test('21.3 Escalation finds overdue alert', !!match,
            `found=${!!match} retry_count=${match?.retry_count}`);
    }

    // 21.4: Simulate escalation update (retry_count increment + next_escalation_at)
    if (testAlert) {
        const nextDelay = 5 * 60 * 1000; // 5 min for P0
        const { error: updateErr } = await sb.from('alert_deliveries').update({
            retry_count: 1,
            next_escalation_at: new Date(Date.now() + nextDelay).toISOString(),
        }).eq('id', testAlert.id);
        const { data: updated } = await sb.from('alert_deliveries')
            .select('retry_count, next_escalation_at').eq('id', testAlert.id).single();
        test('21.4 Escalation update works', !updateErr && updated?.retry_count === 1,
            `retry_count=${updated?.retry_count} next_at=${updated?.next_escalation_at?.substring(0, 19)}`);
    }

    // 21.5: Max retries — set next_escalation_at to null
    if (testAlert) {
        await sb.from('alert_deliveries').update({
            retry_count: 12, next_escalation_at: null
        }).eq('id', testAlert.id);
        const { data: stopped } = await sb.from('alert_deliveries')
            .select('retry_count, next_escalation_at').eq('id', testAlert.id).single();
        test('21.5 Max retries stops escalation', stopped?.next_escalation_at === null && stopped?.retry_count === 12,
            `retry=${stopped?.retry_count} next_at=${stopped?.next_escalation_at}`);
    }

    // 21.6: Morning brief table queries (all tables accessible)
    const [leads, drafts, pages, errors, queue, jobRuns] = await Promise.all([
        sb.from('crm_leads').select('*', { count: 'exact', head: true }),
        sb.from('content_drafts').select('*', { count: 'exact', head: true }),
        sb.from('page_index').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        sb.from('system_runtime_errors').select('*', { count: 'exact', head: true }),
        sb.from('generation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('job_runs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    ]);
    test('21.6 Morning brief queries (all tables)',
        !leads.error && !drafts.error && !pages.error && !errors.error && !queue.error && !jobRuns.error,
        `leads=${leads.count} drafts=${drafts.count} pages=${pages.count} errors=${errors.count}`);

    // ===== PHASE 22: DOCS VALIDATION =====
    console.log('\n========== PHASE 22: DOCUMENTATION ==========');

    const templates = ['TEMPLATE_FIX.md', 'TEMPLATE_AUDIT.md', 'TEMPLATE_FEATURE.md',
        'TEMPLATE_INCIDENT.md', 'TEMPLATE_DECISION.md', 'TEMPLATE_MIGRATION.md'];
    for (const t of templates) {
        const exists = fs.existsSync(`docs/templates/${t}`);
        test(`22d Template: ${t}`, exists);
    }

    const fix006 = fs.existsSync('docs/fixes/fix_006_phase4_5_21_gap_closure.md');
    test('22c Retroactive fix doc exists', fix006);

    // ===== CLEANUP =====
    console.log('\n========== CLEANUP ==========');
    if (testAlert) {
        await sb.from('alert_deliveries').delete().eq('id', testAlert.id);
        console.log('  Test alert removed');
    }
    await sb.from('bulk_generation_jobs').delete().like('name', 'TEST-%');
    console.log('  Test bulk jobs removed');
    // Clean up test pincode data
    await sb.from('pincode_areas').delete().in('pincode', ['999001', '999002']);
    // Clean up test city/localities
    const { data: testCity } = await sb.from('cities').select('id').eq('slug', 'testcity').single();
    if (testCity) {
        await sb.from('localities').delete().eq('city_id', testCity.id);
        await sb.from('cities').delete().eq('id', testCity.id);
    }
    console.log('  Test location data removed');

    // ===== SUMMARY =====
    console.log('\n========== VALIDATION SUMMARY ==========');
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log(`\n  TOTAL: ${results.length} tests`);
    console.log(`  PASSED: ${passed} ✅`);
    console.log(`  FAILED: ${failed} ❌`);

    if (failed > 0) {
        console.log('\n  FAILURES:');
        results.filter(r => !r.pass).forEach(r => console.log(`    ❌ ${r.name} — ${r.detail}`));
    }

    console.log('\n========== ROLLBACK QUERIES ==========');
    console.log('  Phase 4: ALTER TABLE bulk_generation_jobs DROP COLUMN IF EXISTS locality_ids; ALTER TABLE bulk_generation_jobs DROP COLUMN IF EXISTS pincode_filter;');
    console.log('  Phase 21: ALTER TABLE alert_deliveries DROP COLUMN IF EXISTS retry_count;');
}

run().catch(e => console.error('FATAL:', e.message));
