const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function checkErrors() {
    console.log("Checking system_runtime_errors for the last hour...");
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    
    // We try querying system_runtime_errors first
    const { data, error } = await supabase
        .from('system_runtime_errors')
        .select('*')
        .gte('created_at', oneHourAgo);

    if (error) {
        console.log("❌ Error fetching logs or table missing:", error.message);
        // It's possible the table isn't created in production yet if migrations didn't run, 
        // but if the system is LIVE we expect it to work.
    } else if (data && data.length > 0) {
        console.log(`❌ Found ${data.length} recent system errors:`);
        data.forEach(e => console.log(`- [${e.component}] ${e.error_message}`));
    } else {
        console.log("✅ No recent 500 errors or unhandled exceptions found in DB.");
    }
}
checkErrors();
