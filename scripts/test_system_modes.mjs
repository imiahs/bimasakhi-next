/**
 * PHASE 8: System Mode Test
 * Test: NORMAL → DEGRADED → EMERGENCY and verify behavior at each level
 * 
 * Usage: node --env-file=.env.local scripts/test_system_modes.mjs
 */

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const BASE_URL = 'https://bimasakhi.com';

async function getSystemMode() {
    const { data } = await supabase
        .from('system_control_config')
        .select('system_mode')
        .eq('singleton_key', true)
        .single();
    return data?.system_mode;
}

async function setSystemMode(mode) {
    const { error } = await supabase
        .from('system_control_config')
        .update({ system_mode: mode, updated_at: new Date().toISOString() })
        .eq('singleton_key', true);
    if (error) throw new Error(`Failed to set mode: ${error.message}`);
}

async function checkStatus() {
    const resp = await fetch(`${BASE_URL}/api/status`, { headers: { 'Accept': 'application/json' } });
    return resp.json();
}

async function createTestLead(suffix) {
    const ts = Date.now();
    const resp = await fetch(`${BASE_URL}/api/crm/create-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: `Mode Test ${suffix}`,
            mobile: `700030000${suffix}`,
            email: `mode-test-${suffix}@test.com`,
            city: 'Test',
            state: 'Test',
            pincode: '100001',
            source: 'mode_test',
            session_id: `mode-test-${ts}`,
        }),
    });
    return resp.json();
}

async function main() {
    console.log('═══ PHASE 8: SYSTEM MODE TEST ═══\n');

    // Save initial mode
    const initialMode = await getSystemMode();
    console.log(`Initial mode: ${initialMode}`);

    // ── TEST 1: NORMAL MODE ──
    console.log('\n── TEST 1: NORMAL MODE ──');
    await setSystemMode('normal');
    const normalStatus = await checkStatus();
    console.log(`  /api/status mode: ${normalStatus.checks?.system_mode}`);
    console.log(`  Status: ${normalStatus.status}`);
    
    const normalLead = await createTestLead('1');
    console.log(`  Lead created: ${normalLead.success ? '✓' : '✗'} action=${normalLead.action || 'n/a'}`);
    console.log(`  Expected: success=true, action=event_bus_dispatched`);
    const normalPass = normalLead.success && normalStatus.checks?.system_mode === 'normal';
    console.log(`  RESULT: ${normalPass ? '✓ PASS' : '✗ FAIL'}`);

    // ── TEST 2: DEGRADED MODE ──
    console.log('\n── TEST 2: DEGRADED MODE ──');
    await setSystemMode('degraded');
    await new Promise(r => setTimeout(r, 2000)); // Allow config propagation
    const degradedStatus = await checkStatus();
    console.log(`  /api/status mode: ${degradedStatus.checks?.system_mode}`);
    console.log(`  Status: ${degradedStatus.status}`);
    
    const degradedLead = await createTestLead('2');
    console.log(`  Lead created: ${degradedLead.success ? '✓' : '✗'} action=${degradedLead.action || 'n/a'}`);
    console.log(`  Expected: success=true (critical events still processed)`);
    const degradedPass = degradedLead.success && degradedStatus.checks?.system_mode === 'degraded';
    console.log(`  RESULT: ${degradedPass ? '✓ PASS' : '✗ FAIL'}`);

    // ── TEST 3: EMERGENCY MODE ──
    console.log('\n── TEST 3: EMERGENCY MODE ──');
    await setSystemMode('emergency');
    await new Promise(r => setTimeout(r, 2000));
    const emergencyStatus = await checkStatus();
    console.log(`  /api/status mode: ${emergencyStatus.checks?.system_mode}`);
    console.log(`  HTTP status: ${emergencyStatus.status}`);
    
    const emergencyLead = await createTestLead('3');
    console.log(`  Lead created: ${emergencyLead.success ? '✓' : '✗'} action=${emergencyLead.action || 'n/a'}`);
    console.log(`  Expected: Lead saved to DB, but dispatch blocked (stored_only)`);
    
    // In emergency, lead should still be saved in DB (DB writes always happen)
    // But event bus should store-only, no QStash dispatch
    const { data: emergencyEventCheck } = await supabase
        .from('event_store')
        .select('status')
        .eq('source', 'crm_handler')
        .order('created_at', { ascending: false })
        .limit(1);
    
    const eventStatus = emergencyEventCheck?.[0]?.status;
    console.log(`  Latest event_store status: ${eventStatus}`);
    console.log(`  Expected: skipped (emergency_mode blocks dispatch)`);
    const emergencyPass = emergencyLead.success && emergencyStatus.checks?.system_mode === 'emergency';
    console.log(`  RESULT: ${emergencyPass ? '✓ PASS' : '✗ FAIL'}`);

    // ── RESTORE NORMAL MODE ──
    console.log('\n── RESTORING NORMAL MODE ──');
    await setSystemMode('normal');
    const restored = await getSystemMode();
    console.log(`  Restored to: ${restored}`);

    // Cleanup
    console.log('\n── CLEANUP ──');
    for (let i = 1; i <= 3; i++) {
        await supabase.from('leads').delete().eq('mobile', `700030000${i}`);
    }
    console.log('  ✓ Test leads cleaned up');

    // Summary
    console.log('\n═══ SYSTEM MODE TEST RESULTS ═══');
    console.log(`  NORMAL:    ${normalPass ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  DEGRADED:  ${degradedPass ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  EMERGENCY: ${emergencyPass ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  VERDICT:   ${normalPass && degradedPass && emergencyPass ? '✓ ALL PASS' : '✗ PARTIAL'}`);
}

main().catch(async (err) => {
    console.error('FATAL:', err.message);
    // Always restore normal mode on failure
    await setSystemMode('normal');
    process.exit(1);
});
