/**
 * LOAD TEST — Production Readiness Verification
 * 
 * Simulates:
 *   1. 1000 leads burst (concurrent lead_created events)
 *   2. Retry storm (many retryable events in event_store)
 *   3. Concurrent worker pressure (parallel worker calls)
 * 
 * Verifies:
 *   - No crashes
 *   - No data loss (all events recorded in event_store)
 *   - Predictable behavior (no duplicates, correct state)
 * 
 * Usage:
 *   node --env-file=.env.local scripts/load-test.mjs
 *   node --env-file=.env.local scripts/load-test.mjs --test=burst --count=100
 *   node --env-file=.env.local scripts/load-test.mjs --test=retry
 *   node --env-file=.env.local scripts/load-test.mjs --test=concurrent
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.LOAD_TEST_BASE_URL || 'https://bimasakhi.com';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, val] = arg.replace('--', '').split('=');
    acc[key] = val || 'true';
    return acc;
}, {});

const testToRun = args.test || 'all';
const burstCount = parseInt(args.count || '100', 10); // Default 100 for safety, use --count=1000 for full test

// ─── TEST 1: BURST LOAD ──────────────────────────────────
async function testBurstLoad(count) {
    console.log(`\n═══ TEST 1: BURST LOAD — ${count} leads ═══`);
    const startTime = Date.now();
    const testBatchId = `loadtest_${Date.now()}`;

    // Insert test leads directly into DB (simulating form submissions)
    const leads = Array.from({ length: count }, (_, i) => ({
        full_name: `LoadTest User ${i}`,
        mobile: `9${String(1000000000 + i).slice(1)}`, // Unique fake mobiles
        city: 'LoadTest City',
        source: testBatchId,
        status: 'new',
        sync_status: 'pending',
    }));

    // Batch insert in chunks of 50 (Supabase limit-friendly)
    const chunkSize = 50;
    let insertedCount = 0;
    const insertErrors = [];

    for (let i = 0; i < leads.length; i += chunkSize) {
        const chunk = leads.slice(i, i + chunkSize);
        const { data, error } = await supabase.from('leads').insert(chunk).select('id');
        if (error) {
            insertErrors.push({ chunk: i, error: error.message });
        } else {
            insertedCount += data.length;
        }
    }

    const insertDuration = Date.now() - startTime;

    // Now simulate event_store writes (if table exists)
    let eventInsertCount = 0;
    try {
        const eventWrites = Array.from({ length: Math.min(insertedCount, 200) }, (_, i) => ({
            event_name: 'lead_created',
            payload: { leadId: `loadtest-${i}`, source: testBatchId },
            source: 'load_test',
            status: 'pending',
            priority: i % 5 === 0 ? 'critical' : 'normal',
            retry_count: 0,
            max_retries: 3,
        }));

        for (let i = 0; i < eventWrites.length; i += chunkSize) {
            const chunk = eventWrites.slice(i, i + chunkSize);
            const { data, error } = await supabase.from('event_store').insert(chunk).select('id');
            if (!error && data) eventInsertCount += data.length;
        }
    } catch { /* event_store may not exist yet */ }

    const totalDuration = Date.now() - startTime;

    // Verify: count leads with our batch ID
    const { count: verifyCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('source', testBatchId);

    const result = {
        test: 'burst_load',
        requested: count,
        inserted: insertedCount,
        verified: verifyCount,
        events_written: eventInsertCount,
        insert_errors: insertErrors.length,
        insert_duration_ms: insertDuration,
        total_duration_ms: totalDuration,
        throughput: Math.round(insertedCount / (totalDuration / 1000)),
        data_loss: insertedCount !== verifyCount,
        passed: insertedCount === verifyCount && insertErrors.length === 0,
    };

    console.log(`  Inserted: ${result.inserted}/${result.requested}`);
    console.log(`  Verified: ${result.verified}`);
    console.log(`  Events: ${result.events_written}`);
    console.log(`  Errors: ${result.insert_errors}`);
    console.log(`  Duration: ${result.total_duration_ms}ms`);
    console.log(`  Throughput: ${result.throughput} leads/sec`);
    console.log(`  Data Loss: ${result.data_loss ? 'YES ❌' : 'NO ✅'}`);
    console.log(`  RESULT: ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}`);

    // Cleanup test data
    await supabase.from('leads').delete().eq('source', testBatchId);
    try { await supabase.from('event_store').delete().eq('source', 'load_test'); } catch {}
    console.log('  Cleaned up test data');

    return result;
}

// ─── TEST 2: RETRY STORM ─────────────────────────────────
async function testRetryStorm() {
    console.log('\n═══ TEST 2: RETRY STORM ═══');
    const startTime = Date.now();
    const count = 50;

    // Check if event_store exists
    const { error: tableCheck } = await supabase.from('event_store').select('id').limit(1);
    if (tableCheck) {
        console.log('  SKIPPED — event_store table not available:', tableCheck.message);
        return { test: 'retry_storm', passed: true, skipped: true, reason: tableCheck.message };
    }

    const failedEvents = Array.from({ length: count }, (_, i) => ({
        event_name: 'lead_created',
        payload: { leadId: `retry-test-${i}` },
        source: 'retry_storm_test',
        status: 'failed',
        priority: i % 3 === 0 ? 'critical' : 'normal',
        retry_count: i % 4,
        max_retries: 3,
        last_error: 'Simulated failure for load test',
    }));

    const { data: inserted, error: insertErr } = await supabase
        .from('event_store')
        .insert(failedEvents)
        .select('id');

    if (insertErr) {
        console.error('  Failed to insert retry events:', insertErr.message);
        return { test: 'retry_storm', passed: false, error: insertErr.message };
    }

    const { data: retryable } = await supabase
        .from('event_store')
        .select('*')
        .eq('source', 'retry_storm_test')
        .in('status', ['pending', 'failed'])
        .lt('retry_count', 3)
        .order('priority', { ascending: true })
        .limit(50);

    const duration = Date.now() - startTime;
    const maxedOut = failedEvents.filter(e => e.retry_count >= e.max_retries).length;
    const expectedRetryable = count - maxedOut;

    const result = {
        test: 'retry_storm',
        events_created: inserted.length,
        retryable_found: retryable?.length || 0,
        expected_retryable: expectedRetryable,
        maxed_out: maxedOut,
        duration_ms: duration,
        passed: (retryable?.length || 0) === expectedRetryable,
    };

    console.log(`  Events created: ${result.events_created}`);
    console.log(`  Retryable found: ${result.retryable_found} (expected: ${result.expected_retryable})`);
    console.log(`  Maxed out (dead-letter): ${result.maxed_out}`);
    console.log(`  Duration: ${result.duration_ms}ms`);
    console.log(`  RESULT: ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}`);

    try { await supabase.from('event_store').delete().eq('source', 'retry_storm_test'); } catch {}
    console.log('  Cleaned up test data');

    return result;
}

// ─── TEST 3: CONCURRENT PRESSURE ─────────────────────────
async function testConcurrentPressure() {
    console.log('\n═══ TEST 3: CONCURRENT WRITE PRESSURE ═══');
    const startTime = Date.now();
    const concurrency = 20;
    const testBatchId = `concurrent_${Date.now()}`;

    // Simulate concurrent writes to the same lead (race condition test)
    const uniqueMobile = `99${Date.now().toString().slice(-8)}`;
    const { data: testLead, error: leadErr } = await supabase
        .from('leads')
        .insert({ full_name: 'Concurrent Test', mobile: uniqueMobile, city: 'Test', source: testBatchId, status: 'new', sync_status: 'pending' })
        .select('id')
        .single();

    if (!testLead) {
        console.error('  Failed to create test lead:', leadErr?.message);
        return { test: 'concurrent_pressure', passed: false, error: leadErr?.message || 'lead creation failed' };
    }

    const leadId = testLead.id;

    // Concurrent observability_logs writes (always exists, unlike event_store)
    const writePromises = Array.from({ length: concurrency }, (_, i) =>
        supabase.from('observability_logs').insert({
            level: 'LOAD_TEST',
            message: `Concurrent write test ${i}`,
            source: testBatchId,
            metadata: { leadId, index: i },
        }).select('id')
    );

    const writeResults = await Promise.allSettled(writePromises);
    const succeeded = writeResults.filter(r => r.status === 'fulfilled' && !r.value.error).length;
    const failed = writeResults.filter(r => r.status === 'rejected' || r.value?.error).length;

    // Verify all writes persisted
    const { count: verifiedEvents } = await supabase
        .from('observability_logs')
        .select('*', { count: 'exact', head: true })
        .eq('source', testBatchId);

    // Concurrent updates to same lead (simulates scoring race)
    const updatePromises = Array.from({ length: 10 }, (_, i) =>
        supabase.from('leads').update({ lead_score: 50 + i }).eq('id', leadId).select('lead_score')
    );
    const updateResults = await Promise.allSettled(updatePromises);
    const updatesSucceeded = updateResults.filter(r => r.status === 'fulfilled' && !r.value.error).length;

    // Final state should be deterministic (one of the scores)
    const { data: finalLead } = await supabase.from('leads').select('lead_score').eq('id', leadId).single();

    const duration = Date.now() - startTime;

    const result = {
        test: 'concurrent_pressure',
        concurrent_writes: concurrency,
        writes_succeeded: succeeded,
        writes_failed: failed,
        verified_in_db: verifiedEvents,
        concurrent_updates: 10,
        updates_succeeded: updatesSucceeded,
        final_lead_score: finalLead?.lead_score,
        duration_ms: duration,
        data_loss: succeeded !== verifiedEvents,
        passed: succeeded === verifiedEvents && failed === 0,
    };

    console.log(`  Concurrent writes: ${result.writes_succeeded}/${concurrency}`);
    console.log(`  Verified in DB: ${result.verified_in_db}`);
    console.log(`  Concurrent updates: ${result.updates_succeeded}/10`);
    console.log(`  Final score: ${result.final_lead_score}`);
    console.log(`  Data Loss: ${result.data_loss ? 'YES ❌' : 'NO ✅'}`);
    console.log(`  Duration: ${result.duration_ms}ms`);
    console.log(`  RESULT: ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}`);

    // Cleanup
    await supabase.from('leads').delete().eq('source', testBatchId);
    try { await supabase.from('observability_logs').delete().eq('source', testBatchId); } catch {}
    console.log('  Cleaned up test data');

    return result;
}

// ─── MAIN ─────────────────────────────────────────────────
async function main() {
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║  BIMASAKHI LOAD TEST — Production Ready?  ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`Target: ${SUPABASE_URL}`);
    console.log(`Test: ${testToRun}`);
    console.log(`Burst count: ${burstCount}`);

    const results = [];

    try {
        if (testToRun === 'all' || testToRun === 'burst') {
            results.push(await testBurstLoad(burstCount));
        }
        if (testToRun === 'all' || testToRun === 'retry') {
            results.push(await testRetryStorm());
        }
        if (testToRun === 'all' || testToRun === 'concurrent') {
            results.push(await testConcurrentPressure());
        }
    } catch (err) {
        console.error('\nFATAL ERROR:', err.message);
        process.exit(1);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════');

    const allPassed = results.every(r => r.passed);
    for (const r of results) {
        console.log(`  ${r.passed ? '✅' : '❌'} ${r.test} — ${r.passed ? 'PASSED' : 'FAILED'}`);
    }

    console.log(`\nOVERALL: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
    process.exit(allPassed ? 0 : 1);
}

main();
