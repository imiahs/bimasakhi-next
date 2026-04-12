import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import crypto from 'crypto';
import { TRIGGER_MAP } from '@/lib/events/triggerMap';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENT_TYPES = new Set([
    'session_started',
    'page_view',
    'cta_clicked',
    'form_submit_attempted',
    'form_submit_succeeded',
    'form_submit_failed'
]);

export async function POST(request) {
    try {
        const body = await request.json();
        const { session_id, event_type, event_name, payload } = body;

        // 1. Validate contract
        if (!session_id || !event_type || !event_name) {
            return NextResponse.json({ error: 'Missing strict contract fields' }, { status: 400 });
        }

        if (!ALLOWED_EVENT_TYPES.has(event_type)) {
            return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        
        // 2. Extract context
        const user_agent = request.headers.get('user-agent') || 'unknown';
        const forwarded = request.headers.get('x-forwarded-for');
        const ip_address = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
        const created_at = new Date().toISOString(); // Server-authoritative timestamp
        const source = payload?.source || 'api_event';
        const event_id = crypto.randomUUID();

        // 3. UPSERT Session 
        // "Client proposes identity, server confirms identity"
        const { error: sessionErr } = await supabase
            .from('sessions')
            .upsert(
                {
                    session_id,
                    user_agent,
                    ip_address,
                    updated_at: created_at
                },
                { onConflict: 'session_id', ignoreDuplicates: false }
            );

        if (sessionErr) throw sessionErr;

        // Prevent duplicate session_started
        if (event_type === 'session_started') {
            const { count } = await supabase
                .from('event_stream')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', session_id)
                .eq('event_type', 'session_started');
            
            if (count > 0) {
                return NextResponse.json({ success: true, accepted: true, note: 'Duplicate session_started ignored' });
            }
        }

        // 4. INSERT Event Stream
        // Server authoritative row maps
        const { error: eventErr } = await supabase
            .from('event_stream')
            .insert({
                session_id,
                event_type,
                event_name,
                payload: payload || {},
                ip_address,
                user_agent,
                created_at
            });

        if (eventErr) throw eventErr;

        // Phase 4 Event Storage
        const { error: logErr } = await supabase
            .from('events_log')
            .insert({
                id: event_id,
                event_name,
                event_type,
                payload: payload || {},
                source,
                created_at
            });
            
        if (logErr) {
            console.error('[Telemetry] events_log Failed:', logErr.message);
        }

        // Phase 4 Event -> Queue Connector
        const trigger = TRIGGER_MAP[event_type];
        if (trigger && trigger.action === "queue_job") {
            const { error: jobErr } = await supabase
                .from('job_queue')
                .insert({
                    job_type: trigger.job_type,
                    payload: { event_id, session_id, ...payload },
                    status: 'pending',
                    created_at,
                    updated_at: created_at
                });
                
            if (jobErr) {
                console.error('[Queue] Enqueue Failed:', jobErr.message);
                throw jobErr; // Ensure structural queue failure throws for failure logging
            } else {
                console.log(`[Queue] Job Enqueued: ${trigger.job_type} from ${event_type}`);
            }
        }

        return NextResponse.json({ success: true, accepted: true, event_id });

    } catch (error) {
        // Logging mandatory
        console.error('[Telemetry] Ingestion Failed:', error.message);
        
        // Try fallback log to observability_logs if possible (fire and forget)
        try {
            const supabase = getServiceSupabase();
            supabase.from('observability_logs').insert({
                level: 'ERROR',
                message: `Telemetry Ingestion Failed: ${error.message}`,
                source: 'api_events_telemetry',
                created_at: new Date().toISOString()
            }).then();
        } catch (e) {
            // Drop silently
        }

        // Return strictly 202 Accepted on failure (No silent invisible failures locally, but client UX protected)
        return NextResponse.json(
            { success: false, accepted: true, reason: "ingestion_failed" }, 
            { status: 202 }
        );
    }
}
