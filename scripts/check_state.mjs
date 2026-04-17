import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Check event_store
const { data: events } = await s.from('event_store')
    .select('id, event_name, status, retry_count, last_error, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

console.log('EVENT STORE:', events?.length, 'entries');
events?.forEach(e => console.log(`  [${e.status}] ${e.event_name} retry=${e.retry_count} err=${(e.last_error || 'none').substring(0, 100)}`));

// Check recent leads
const { data: leads } = await s.from('leads')
    .select('id, full_name, mobile, lead_score, agent_id, sync_status')
    .order('created_at', { ascending: false })
    .limit(5);

console.log('\nRECENT LEADS:', leads?.length);
leads?.forEach(l => console.log(`  ${l.full_name} | ${l.mobile} | score=${l.lead_score} | agent=${l.agent_id || 'none'} | sync=${l.sync_status}`));
