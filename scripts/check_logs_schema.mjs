import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
for (const table of ['system_runtime_errors', 'observability_logs', 'job_dead_letters']) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
        console.log(`${table}: ERROR — ${error.message}`);
    } else if (data && data.length > 0) {
        console.log(`${table} columns:`, Object.keys(data[0]));
    } else {
        console.log(`${table}: (empty table)`);
        // Try LIMIT 0 to get column info from API
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?limit=0`;
        const resp = await fetch(url, {
            headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }
        });
        console.log(`  (REST ${resp.status})`);
    }
}
