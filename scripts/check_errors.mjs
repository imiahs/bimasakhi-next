import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Check event_store with full detail
const { data: events } = await s.from('event_store')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

console.log('EVENT STORE FULL DETAIL:');
events?.forEach(e => {
    console.log(`\n  ID: ${e.id}`);
    console.log(`  event: ${e.event_name} | status: ${e.status}`);
    console.log(`  retry: ${e.retry_count} | priority: ${e.priority}`);
    console.log(`  error: ${e.last_error || 'none'}`);
    console.log(`  dispatched: ${e.dispatched_at || 'no'} | completed: ${e.completed_at || 'no'}`);
    console.log(`  payload keys: ${Object.keys(e.payload || {}).join(', ')}`);
    console.log(`  msg_id: ${e.dispatch_message_id || 'none'}`);
});

// Check observability logs for recent errors
const { data: logs } = await s.from('observability_logs')
    .select('level, message, source, created_at')
    .in('level', ['ERROR', 'EXECUTIVE_FAILED', 'EVENT_DISPATCH_FAILED', 'QUEUE_ERROR'])
    .order('created_at', { ascending: false })
    .limit(10);

console.log('\n\nRECENT ERROR LOGS:');
logs?.forEach(l => console.log(`  [${l.level}] ${l.source}: ${l.message?.substring(0, 120)}`));
