const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log("Testing failed_leads...");
    const { data: failed, error: err1 } = await supabase.from('failed_leads').select('*').limit(1);
    console.log("FAILED LEADS:", err1 ? err1 : "OK");

    console.log("Testing system_logs...");
    const { data: logs, error: err2 } = await supabase.from('system_logs').select('*').limit(1);
    console.log("SYSTEM LOGS:", err2 ? err2 : "OK");
}

test();
