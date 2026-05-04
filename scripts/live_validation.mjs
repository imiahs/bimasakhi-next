/**
 * LIVE PRODUCTION VALIDATION — Phase 4/5/21
 * Run: node scripts/live_validation.mjs
 * Target: https://bimasakhi.com (production)
 */
import https from 'https';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const HOST = 'bimasakhi.com';
const envLines = fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; });
const env = Object.fromEntries(envLines);
const pw = env.ADMIN_PASSWORD;
const adminEmail = (env.ADMIN_EMAIL || 'admin@bimasakhi.com').trim().toLowerCase();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function req(method, path, body, cookie) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : '';
        const opts = {
            hostname: HOST, port: 443, path, method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': `https://${HOST}`,
                ...(cookie ? { Cookie: cookie } : {}),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const r = https.request(opts, res => {
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
    console.log('==============================================');
    console.log('  LIVE PRODUCTION VALIDATION');
    console.log(`  Target: https://${HOST}`);
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log('==============================================\n');

    // === AUTH — Production Login ===
    console.log('--- AUTH ---');
    const login = await req('POST', '/api/admin/login', { email: adminEmail, password: pw });
    const cookie = login.cookies;
    test('PROD LOGIN', login.status === 200, `status=${login.status}`);

    if (login.status !== 200) {
        console.log('\n❌ FATAL: Cannot authenticate to production. Aborting.');
        console.log('Response:', JSON.stringify(login.body).substring(0, 200));
        return;
    }

    // Real UUIDs from DB
    const realIds = [
        '9fb065b2-088f-40e6-af04-b7340589a73a', // Dwarka
        '0bc9836e-2d5e-4904-92cb-b0a12f4d6686', // Rohini
        'a0658d4e-c10e-4340-8e91-ce88503e23bd', // Janakpuri
    ];

    // ===== PHASE 4: LIVE BULK JOB WITH LOCALITY_IDS =====
    console.log('\n========== PHASE 4: LIVE BULK JOB TEST ==========');

    const t41 = await req('POST', '/api/admin/ccc/bulk', {
        name: 'LIVETEST-locality-targeting',
        intent_type: 'lic_agent',
        base_keyword: 'lic agent live test',
        locality_ids: realIds,
        scope: 'locality'
    }, cookie);

    test('P4.1 POST bulk with locality_ids (PROD)',
        t41.status === 200 && t41.body?.data?.total_pages === 3 && t41.body?.data?.locality_ids?.length === 3,
        `status=${t41.status} pages=${t41.body?.data?.total_pages} ids=${t41.body?.data?.locality_ids?.length}`);

    console.log('  API Response:', JSON.stringify(t41.body).substring(0, 300));

    // DB Verify
    const { data: liveJob } = await sb.from('bulk_generation_jobs')
        .select('id, name, total_pages, locality_ids, status, created_at')
        .eq('name', 'LIVETEST-locality-targeting')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    test('P4.2 DB verify — job stored in prod DB',
        liveJob?.total_pages === 3 && liveJob?.locality_ids?.length === 3 && liveJob?.status === 'planned',
        `id=${liveJob?.id} pages=${liveJob?.total_pages} ids=${liveJob?.locality_ids?.length} status=${liveJob?.status}`);
    console.log('  DB Row:', JSON.stringify(liveJob));

    // GET list — verify it appears
    const t43 = await req('GET', '/api/admin/ccc/bulk', null, cookie);
    const liveJobInList = (t43.body?.data || []).find(j => j.name === 'LIVETEST-locality-targeting');
    test('P4.3 GET list — job visible in API',
        !!liveJobInList,
        `found=${!!liveJobInList}`);

    // ===== PHASE 5: LIVE PINCODE IMPORT =====
    console.log('\n========== PHASE 5: LIVE PINCODE IMPORT TEST ==========');

    const t51 = await req('POST', '/api/admin/locations/import', {
        dataset: [
            { pincode: '998001', city_name: 'LiveTestCity', locality_name: 'LIVETEST-Place-A', state: 'LiveTestState' },
            { pincode: '998002', city_name: 'LiveTestCity', locality_name: 'LIVETEST-Place-B', state: 'LiveTestState' },
        ]
    }, cookie);
    test('P5.1 POST pincode import (PROD)',
        t51.status === 200 && t51.body?.success === true,
        `status=${t51.status} body=${JSON.stringify(t51.body)}`);

    // DB verify — cities
    const { data: liveCity } = await sb.from('cities')
        .select('id, city_name, slug')
        .eq('slug', 'livetestcity')
        .single();
    test('P5.2 DB verify — city created',
        !!liveCity,
        `city=${liveCity?.city_name} id=${liveCity?.id}`);

    // DB verify — localities
    let liveLocs = [];
    if (liveCity) {
        const { data } = await sb.from('localities')
            .select('id, locality_name')
            .eq('city_id', liveCity.id);
        liveLocs = data || [];
    }
    test('P5.3 DB verify — localities created',
        liveLocs.length >= 2,
        `count=${liveLocs.length} names=${liveLocs.map(l => l.locality_name).join(', ')}`);

    // DB verify — pincodes
    let livePins = [];
    if (liveLocs.length > 0) {
        const { data } = await sb.from('pincodes')
            .select('id, pincode, locality_id')
            .in('locality_id', liveLocs.map(l => l.id));
        livePins = data || [];
    }
    test('P5.4 DB verify — pincodes created',
        livePins.length >= 2,
        `count=${livePins.length} pincodes=${livePins.map(p => p.pincode).join(', ')}`);

    // ===== PHASE 21: LIVE ALERT TEST =====
    console.log('\n========== PHASE 21: LIVE ALERT + ESCALATION TEST ==========');

    // Insert a test P1 alert into alert_deliveries
    const { data: testAlert, error: alertErr } = await sb.from('alert_deliveries').insert({
        alert_type: 'LIVE_VALIDATION_TEST',
        severity: 'P1',
        message: '🧪 LIVE VALIDATION TEST — This is a test alert from production validation. If you see this in Telegram, live alert delivery is CONFIRMED.',
        channels_attempted: ['telegram'],
        channels_delivered: [],
        delivery_status: 'pending',
        acknowledged: false,
        next_escalation_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min in past → should be picked up
        retry_count: 0,
    }).select().single();
    test('P21.1 Insert test alert (PROD DB)',
        !alertErr && !!testAlert?.id,
        `id=${testAlert?.id} err=${alertErr?.message || 'none'}`);

    // Verify escalation query finds it
    if (testAlert) {
        const { data: found } = await sb.from('alert_deliveries')
            .select('id, alert_type, severity, retry_count, next_escalation_at')
            .eq('acknowledged', false)
            .in('severity', ['P0', 'P1'])
            .not('next_escalation_at', 'is', null)
            .lte('next_escalation_at', new Date().toISOString())
            .limit(10);
        const match = found?.find(a => a.id === testAlert.id);
        test('P21.2 Escalation query finds test alert',
            !!match,
            `found=${!!match} severity=${match?.severity} retry=${match?.retry_count}`);
    }

    // Check recent observability logs for alert-scan activity
    const { data: recentLogs } = await sb.from('observability_logs')
        .select('level, message, source, created_at')
        .in('source', ['alert-scan', 'morning-brief', 'escalation'])
        .order('created_at', { ascending: false })
        .limit(10);
    test('P21.3 Observability logs — cron activity exists',
        (recentLogs?.length || 0) > 0,
        `recent_entries=${recentLogs?.length || 0}`);
    if (recentLogs?.length > 0) {
        console.log('  Recent cron logs:');
        recentLogs.forEach(l => console.log(`    ${l.created_at?.substring(0, 19)} [${l.level}] ${l.source}: ${l.message?.substring(0, 80)}`));
    }

    // Check if alert-scan cron has run recently (from job_runs or observability_logs)
    const { data: alertScanRuns } = await sb.from('observability_logs')
        .select('level, source, created_at')
        .eq('source', 'alert-scan')
        .order('created_at', { ascending: false })
        .limit(5);
    test('P21.4 Alert-scan cron has run',
        (alertScanRuns?.length || 0) > 0,
        `runs=${alertScanRuns?.length || 0} latest=${alertScanRuns?.[0]?.created_at?.substring(0, 19) || 'none'}`);

    // We'll check in a few minutes if Telegram was delivered
    // For now, send a direct Telegram test to confirm channel works
    const telegramToken = env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = env.TELEGRAM_CHAT_ID;
    if (telegramToken && telegramChatId) {
        const tgMsg = `🧪 *LIVE VALIDATION TEST*\n\nPhase 21 — Alert Delivery Verification\nTimestamp: ${new Date().toISOString()}\nSource: Production validation script\n\n✅ If you see this, Telegram alert channel is CONFIRMED working.`;
        const tgResult = await new Promise((resolve, reject) => {
            const tgData = JSON.stringify({ chat_id: telegramChatId, text: tgMsg, parse_mode: 'Markdown' });
            const tgReq = https.request({
                hostname: 'api.telegram.org',
                path: `/bot${telegramToken}/sendMessage`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(tgData) }
            }, res => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
                    catch { resolve({ status: res.statusCode, body }); }
                });
            });
            tgReq.on('error', reject);
            tgReq.write(tgData);
            tgReq.end();
        });
        test('P21.5 Telegram direct send (PROD)',
            tgResult.status === 200 && tgResult.body?.ok === true,
            `status=${tgResult.status} ok=${tgResult.body?.ok} msg_id=${tgResult.body?.result?.message_id}`);
    } else {
        test('P21.5 Telegram direct send (PROD)', false, 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in .env.local');
    }

    // ===== CLEANUP =====
    console.log('\n========== CLEANUP ==========');

    // Clean up test bulk job
    if (liveJob) {
        await sb.from('bulk_generation_jobs').delete().eq('id', liveJob.id);
        console.log('  Cleaned: test bulk job');
    }

    // Clean up test location data
    if (livePins.length > 0) {
        await sb.from('pincodes').delete().in('id', livePins.map(p => p.id));
        console.log('  Cleaned: test pincodes');
    }
    if (liveLocs.length > 0) {
        await sb.from('localities').delete().in('id', liveLocs.map(l => l.id));
        console.log('  Cleaned: test localities');
    }
    if (liveCity) {
        await sb.from('cities').delete().eq('id', liveCity.id);
        console.log('  Cleaned: test city');
    }

    // Clean up test alert (acknowledge it so escalation doesn't re-fire)
    if (testAlert) {
        await sb.from('alert_deliveries').update({
            acknowledged: true,
            acknowledged_at: new Date().toISOString(),
            next_escalation_at: null,
        }).eq('id', testAlert.id);
        console.log('  Cleaned: test alert (acknowledged)');
    }

    // ===== SUMMARY =====
    console.log('\n==============================================');
    console.log('  LIVE VALIDATION SUMMARY');
    console.log('==============================================');
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log(`\n  TOTAL: ${results.length} tests`);
    console.log(`  PASSED: ${passed} ✅`);
    console.log(`  FAILED: ${failed} ❌`);

    if (failed > 0) {
        console.log('\n  FAILURES:');
        results.filter(r => !r.pass).forEach(r => console.log(`    ❌ ${r.name} — ${r.detail}`));
    }

    console.log('\n  STATUS:');
    console.log(`  Phase 4 (Bulk + Locality): ${results.filter(r => r.name.startsWith('P4')).every(r => r.pass) ? '✅ LIVE VERIFIED' : '❌ ISSUES FOUND'}`);
    console.log(`  Phase 5 (Pincode Import):  ${results.filter(r => r.name.startsWith('P5')).every(r => r.pass) ? '✅ LIVE VERIFIED' : '❌ ISSUES FOUND'}`);
    console.log(`  Phase 21 (Alerts + Cron):  ${results.filter(r => r.name.startsWith('P21')).every(r => r.pass) ? '✅ LIVE VERIFIED' : '❌ ISSUES FOUND'}`);
}

run().catch(e => console.error('FATAL:', e.message));
