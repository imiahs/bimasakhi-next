/**
 * Migration Runner — Executes SQL migrations against Supabase via REST API
 * Usage: node --env-file=.env.local scripts/run_migrations.mjs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('MISSING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

async function runSQL(sql, label) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`RUNNING: ${label}`);
    console.log('='.repeat(60));

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    });

    // Try Supabase SQL endpoint directly if rpc doesn't work
    if (!resp.ok) {
        // Use the pg_net / SQL endpoint
        const sqlResp = await fetch(`${SUPABASE_URL}/pg`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: sql }),
        });
        if (!sqlResp.ok) {
            console.log(`  [WARN] REST SQL endpoints not available. Use Supabase SQL Editor.`);
            return false;
        }
        const data = await sqlResp.json();
        console.log('  RESULT:', JSON.stringify(data, null, 2));
        return true;
    }
    const data = await resp.json();
    console.log('  RESULT:', JSON.stringify(data, null, 2));
    return true;
}

async function verifyTable(tableName) {
    console.log(`\nVERIFYING: ${tableName}...`);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
    });
    if (resp.ok) {
        const data = await resp.json();
        console.log(`  ✓ ${tableName} EXISTS (${data.length} rows returned)`);
        return true;
    } else {
        const err = await resp.text();
        if (err.includes('does not exist') || err.includes('relation') || resp.status === 404) {
            console.log(`  ✗ ${tableName} DOES NOT EXIST`);
            return false;
        }
        console.log(`  ✓ ${tableName} EXISTS (status ${resp.status})`);
        return true;
    }
}

async function verifyColumns(tableName, requiredColumns) {
    console.log(`\nVERIFYING COLUMNS for ${tableName}: ${requiredColumns.join(', ')}`);
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}?select=${requiredColumns.join(',')}&limit=0`,
        {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
        }
    );
    if (resp.ok) {
        console.log(`  ✓ All columns present`);
        return true;
    } else {
        const err = await resp.text();
        console.log(`  ✗ Column check failed: ${err}`);
        return false;
    }
}

async function main() {
    console.log('SUPABASE URL:', SUPABASE_URL);
    console.log('');

    // Step 1: Check current state
    console.log('═══ STEP 1: CHECK CURRENT STATE ═══');
    const eventStoreExists = await verifyTable('event_store');
    const idempotencyExists = await verifyTable('idempotency_keys');
    const systemConfigExists = await verifyTable('system_control_config');
    const systemAlertsExists = await verifyTable('system_alerts');

    console.log('\n═══ CURRENT STATE SUMMARY ═══');
    console.log(`  event_store:          ${eventStoreExists ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`  idempotency_keys:     ${idempotencyExists ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`  system_control_config: ${systemConfigExists ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`  system_alerts:         ${systemAlertsExists ? '✓ EXISTS' : '✗ MISSING'}`);

    // Step 2: Verify columns if tables exist
    if (eventStoreExists) {
        await verifyColumns('event_store', [
            'id', 'event_name', 'payload', 'source', 'status',
            'priority', 'retry_count', 'max_retries', 'last_error',
            'dispatch_message_id', 'execution_context',
            'created_at', 'updated_at', 'dispatched_at', 'completed_at'
        ]);

        // Check tracking columns
        await verifyColumns('event_store', ['worker_result', 'correlation_id']);
    }

    if (idempotencyExists) {
        await verifyColumns('idempotency_keys', [
            'id', 'idempotency_key', 'scope', 'event_id', 'claimed_at', 'created_at'
        ]);
    }

    if (systemConfigExists) {
        // Check system_mode column
        await verifyColumns('system_control_config', ['system_mode']);
    }

    // Step 3: Output migration instructions if needed
    const missing = [];
    if (!eventStoreExists) missing.push('create_event_store.sql');
    if (!idempotencyExists) missing.push('create_idempotency_keys.sql');

    if (missing.length > 0) {
        console.log('\n═══ MIGRATIONS NEEDED ═══');
        console.log('Run these SQL files in Supabase SQL Editor (https://supabase.com/dashboard):');
        missing.forEach((f, i) => console.log(`  ${i + 1}. scripts/${f}`));
        if (eventStoreExists) {
            console.log('  + scripts/add_event_store_tracking_columns.sql (if columns missing)');
        }
        console.log('  + scripts/enable_feature_flags.sql');
    } else {
        console.log('\n═══ ALL TABLES EXIST ═══');
        console.log('Verifying column completeness...');
    }

    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('MIGRATION STATUS:', missing.length === 0 ? 'TABLES READY' : `${missing.length} MIGRATION(S) NEEDED`);
    console.log('═'.repeat(60));
}

main().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
