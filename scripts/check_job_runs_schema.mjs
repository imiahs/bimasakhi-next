import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Query information_schema for job_runs columns
const { data, error } = await supabase
    .rpc('exec_sql', { sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'job_runs' ORDER BY ordinal_position" })
    .single();

if (error) {
    // Fallback: try a direct select and inspect error
    console.log('RPC not available, trying direct query...');
    const { data: rows, error: err2 } = await supabase
        .from('job_runs')
        .select('*')
        .limit(1);
    if (err2) {
        console.log('Error:', err2.message);
    } else if (rows && rows.length > 0) {
        console.log('job_runs columns:', Object.keys(rows[0]));
    } else {
        // Table exists but empty — try selecting specific columns to probe
        console.log('Table is empty, probing schema via REST...');
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL}/rest/v1/job_runs?limit=0`;
        const resp = await fetch(url, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Accept': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        const text = await resp.text();
        console.log('REST response:', text.substring(0, 500));
    }
} else {
    console.log('Columns:', data);
}
