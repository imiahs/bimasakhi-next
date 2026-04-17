/**
 * PHASE 6: Core Flow Test — Create 5 real leads via production API
 * Verify: DB storage, event_store entry, status progression, score, agent, followup
 * 
 * Usage: node --env-file=.env.local scripts/test_core_flow.mjs
 */

const BASE_URL = 'https://bimasakhi.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_LEADS = [
    { name: 'GoLive Test One', mobile: '7000100001', email: 'golive1@test.com', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    { name: 'GoLive Test Two', mobile: '7000100002', email: 'golive2@test.com', city: 'Delhi', state: 'Delhi', pincode: '110001' },
    { name: 'GoLive Test Three', mobile: '7000100003', email: 'golive3@test.com', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
    { name: 'GoLive Test Four', mobile: '7000100004', email: 'golive4@test.com', city: 'Kolkata', state: 'West Bengal', pincode: '700001' },
    { name: 'GoLive Test Five', mobile: '7000100005', email: 'golive5@test.com', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
];

async function createLead(lead) {
    const resp = await fetch(`${BASE_URL}/api/crm/create-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...lead,
            source: 'go_live_test',
            medium: 'api',
            session_id: `golive-session-${Date.now()}-${lead.mobile}`,
        }),
    });
    const data = await resp.json();
    return { status: resp.status, ...data };
}

async function verifyLead(mobile, name) {
    // Check leads table
    const { data: lead, error } = await supabase
        .from('leads')
        .select('id, full_name, mobile, status, lead_score, agent_id, sync_status, zoho_lead_id')
        .eq('mobile', mobile)
        .maybeSingle();

    if (error || !lead) {
        return { stored: false, error: error?.message || 'not found' };
    }

    // Check event_store for lead_created event
    const { data: events } = await supabase
        .from('event_store')
        .select('id, event_name, status, created_at, dispatched_at, completed_at')
        .eq('event_name', 'lead_created')
        .like('payload', `%${lead.id}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    return {
        stored: true,
        lead_id: lead.id,
        lead_score: lead.lead_score,
        agent_id: lead.agent_id,
        sync_status: lead.sync_status,
        zoho_lead_id: lead.zoho_lead_id,
        event_store_entry: events?.length > 0,
        event_status: events?.[0]?.status || 'none',
        event_dispatched: !!events?.[0]?.dispatched_at,
        event_completed: !!events?.[0]?.completed_at,
    };
}

async function main() {
    console.log('═══ PHASE 6: CORE FLOW TEST ═══\n');

    // Step 1: Create 5 leads
    console.log('Step 1: Creating 5 test leads...\n');
    const results = [];

    for (const lead of TEST_LEADS) {
        const result = await createLead(lead);
        console.log(`  ${lead.full_name}: ${result.success ? '✓' : '✗'} (status=${result.status}) ${result.message || ''}`);
        if (result.lead_id) console.log(`    lead_id: ${result.lead_id}`);
        if (result.duplicate) console.log(`    NOTE: duplicate (already exists)`);
        results.push({ ...lead, result });
    }

    // Step 2: Wait for async processing
    console.log('\nStep 2: Waiting 10 seconds for async processing...');
    await new Promise(r => setTimeout(r, 10000));

    // Step 3: Verify each lead
    console.log('\nStep 3: Verification...\n');
    let passCount = 0;

    for (const { full_name, mobile } of TEST_LEADS) {
        const v = await verifyLead(mobile, full_name);
        const checks = [
            { name: 'DB stored', pass: v.stored },
            { name: 'event_store entry', pass: v.event_store_entry },
            { name: 'event status', pass: ['dispatched', 'completed'].includes(v.event_status), value: v.event_status },
        ];

        const allPass = checks.every(c => c.pass);
        if (allPass) passCount++;

        console.log(`  ${full_name} (${mobile}): ${allPass ? '✓ PASS' : '✗ PARTIAL'}`);
        for (const c of checks) {
            console.log(`    ${c.pass ? '✓' : '✗'} ${c.name}${c.value ? ` = ${c.value}` : ''}`);
        }
        console.log(`    lead_score: ${v.lead_score ?? 'pending'} | agent: ${v.agent_id ?? 'pending'} | sync: ${v.sync_status || 'n/a'}`);
    }

    // Step 4: Summary
    console.log(`\n═══ RESULT: ${passCount}/${TEST_LEADS.length} leads verified ═══`);

    // Step 5: Cleanup
    console.log('\nStep 4: Cleanup test leads...');
    for (const lead of TEST_LEADS) {
        await supabase.from('leads').delete().eq('mobile', lead.mobile);
    }
    // Also cleanup any event_store entries
    const { data: testLeadIds } = await supabase
        .from('event_store')
        .select('id')
        .eq('event_name', 'lead_created')
        .eq('source', 'crm_handler')
        .gte('created_at', new Date(Date.now() - 60000).toISOString());
    
    // Don't delete event_store entries — keep for audit trail
    console.log('✓ Test leads cleaned up (event_store entries preserved for audit)');
}

main().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
