/**
 * PHASE 10: Load Test
 * Send 100 leads in rapid succession, verify zero data loss
 * 
 * Usage: node --env-file=.env.local scripts/load_test.mjs
 */

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const BASE_URL = 'https://bimasakhi.com';
const TOTAL = 100;
const CONCURRENCY = 10; // 10 at a time
const PREFIX = '8000';  // mobiles: 8000100001 - 8000100100

async function createLead(i) {
    const num = String(i).padStart(3, '0');
    const mobile = `${PREFIX}1${num.slice(-2)}${String(Math.floor(Math.random()*10000)).padStart(4,'0')}`.slice(0,10);
    // Use unique mobile per lead: 6000 + 6 digits
    const uniqueMobile = `6${String(100000 + i).padStart(9, '0')}`;
    const resp = await fetch(`${BASE_URL}/api/crm/create-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: `Load Test ${i}`,
            mobile: uniqueMobile,
            email: `load-${i}@test.com`,
            pincode: '110001',
            source: 'load_test',
            session_id: `load-${Date.now()}-${i}`,
        }),
    });
    const status = resp.status;
    let data = null;
    try { data = await resp.json(); } catch {}
    return { i, status, success: data?.success, action: data?.action };
}

async function main() {
    console.log(`═══ PHASE 10: LOAD TEST (${TOTAL} leads, concurrency=${CONCURRENCY}) ═══\n`);
    const start = Date.now();
    
    const results = [];
    // Process in batches
    for (let batch = 0; batch < TOTAL; batch += CONCURRENCY) {
        const promises = [];
        for (let j = 0; j < CONCURRENCY && batch + j < TOTAL; j++) {
            promises.push(createLead(batch + j + 1));
        }
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
        
        // Progress
        const done = Math.min(batch + CONCURRENCY, TOTAL);
        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        process.stdout.write(`\r  Progress: ${done}/${TOTAL} | OK: ${succeeded} | FAIL: ${failed}`);
    }
    
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n\n  Completed in ${elapsed}s`);
    
    // Summary
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const httpErrors = results.filter(r => r.status !== 200);
    
    console.log(`\n── API Results ──`);
    console.log(`  Success: ${succeeded}/${TOTAL}`);
    console.log(`  Failed: ${failed}/${TOTAL}`);
    if (httpErrors.length > 0) {
        console.log(`  HTTP errors: ${httpErrors.length}`);
        const statusCounts = {};
        httpErrors.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
        console.log(`  Status codes: ${JSON.stringify(statusCounts)}`);
    }
    
    // Wait for async processing
    console.log('\n  Waiting 30s for async pipeline to process...');
    await new Promise(r => setTimeout(r, 30000));
    
    // Verify DB state
    console.log('\n── DB Verification ──');
    const { data: leads, count: leadCount } = await supabase
        .from('leads')
        .select('id', { count: 'exact' })
        .eq('source', 'load_test');
    console.log(`  Leads in DB: ${leadCount}`);
    
    const { data: events, count: eventCount } = await supabase
        .from('event_store')
        .select('status', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 120000).toISOString());
    
    // Count event statuses
    const statusMap = {};
    events?.forEach(e => { statusMap[e.status] = (statusMap[e.status] || 0) + 1; });
    console.log(`  Events (last 2min): ${eventCount}`);
    console.log(`  Event statuses: ${JSON.stringify(statusMap)}`);
    
    // Cleanup
    console.log('\n── Cleanup ──');
    // Delete in batches
    const mobiles = Array.from({ length: TOTAL }, (_, i) => `6${String(100001 + i).padStart(9, '0')}`);
    for (let i = 0; i < mobiles.length; i += 50) {
        const batch = mobiles.slice(i, i + 50);
        await supabase.from('leads').delete().in('mobile', batch);
    }
    console.log('  ✓ Test leads cleaned up');
    
    // Final verdict
    const dataLoss = succeeded - (leadCount || 0);
    console.log('\n═══ LOAD TEST RESULTS ═══');
    console.log(`  API Success Rate: ${succeeded}/${TOTAL} (${(succeeded/TOTAL*100).toFixed(1)}%)`);
    console.log(`  DB Persistence:   ${leadCount}/${succeeded} leads`);
    console.log(`  Data Loss:        ${dataLoss > 0 ? dataLoss + ' MISSING' : 'ZERO'}`);
    console.log(`  Throughput:       ${(TOTAL / elapsed).toFixed(1)} leads/sec`);
    console.log(`  VERDICT:          ${succeeded >= TOTAL * 0.95 && dataLoss <= 0 ? '✓ PASS' : '✗ FAIL'}`);
}

main().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
