const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data: failed, error: err1 } = await supabase.from('failed_leads').select('*').limit(1);
    console.log("FAILED LEADS:", err1 ? err1 : failed);

    const { data: logs, error: err2 } = await supabase.from('system_logs').select('*').limit(1);
    console.log("SYSTEM LOGS:", err2 ? err2 : logs);
}

test();
