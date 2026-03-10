import { NextResponse } from 'next/server';
import { getLocalDb } from '@/utils/localDb';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// POST /api/events
export async function POST(request) {
    try {
        const body = await request.json();
        const { event_type, session_id, route_path, metadata } = body;

        if (!event_type || !route_path) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ success: true, message: 'Event dropped (Telemetry Disabled)' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error: eventErr } = await supabase.from('event_stream').insert({
            event_type,
            session_id: session_id || 'anonymous',
            route_path,
            metadata: metadata ? metadata : null
        });

        if (eventErr) throw eventErr;

        // Phase 19: Asynchronous Supabase Metric Upserting (Fire & Forget)
        if (event_type === 'page_view') {
            const source = metadata?.source || 'direct';

            // Fire-and-forget RPC call (fallback to fetch/update)
            supabase.from('content_metrics').select('views, id').eq('target_path', route_path).maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        supabase.from('content_metrics').update({ views: data.views + 1, updated_at: new Date() }).eq('id', data.id).then();
                    } else {
                        supabase.from('content_metrics').insert({ target_path: route_path, views: 1 }).then();
                    }
                });

            supabase.from('traffic_sources').select('visits, id').eq('source', source).maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        supabase.from('traffic_sources').update({ visits: data.visits + 1, updated_at: new Date() }).eq('id', data.id).then();
                    } else {
                        supabase.from('traffic_sources').insert({ source, visits: 1 }).then();
                    }
                });
        }

        return NextResponse.json({ success: true, message: 'Event logged successfully' });
    } catch (error) {
        console.error('Event logging error:', error);

        // Log to observability_logs as fallback
        try {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);
                await supabase.from('observability_logs').insert({
                    level: 'ERROR',
                    message: error.message,
                    source: 'api_events'
                });
            }
        } catch (e) {
            console.error('Critical Telemetry failure:', e);
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
