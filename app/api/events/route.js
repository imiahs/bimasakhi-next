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

        const db = getLocalDb();
        const stmt = db.prepare(`
            INSERT INTO event_stream (event_type, session_id, route_path, metadata)
            VALUES (?, ?, ?, ?)
        `);

        stmt.run(
            event_type,
            session_id || 'anonymous',
            route_path,
            metadata ? JSON.stringify(metadata) : null
        );

        // Phase 19: Asynchronous Supabase Metric Upserting (Fire & Forget)
        if (event_type === 'page_view') {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (supabaseUrl && supabaseKey && process.env.SUPABASE_ENABLED === 'true') {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const source = metadata?.source || 'direct';

                // Fire-and-forget RPC call (requires Supabase RPC function, fallback to fetch/update)
                // Since we don't have RPC defined yet, we will fetch then update
                supabase.from('content_metrics').select('views').eq('target_path', route_path).single()
                    .then(({ data }) => {
                        if (data) {
                            supabase.from('content_metrics').update({ views: data.views + 1, updated_at: new Date() }).eq('target_path', route_path).then();
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
        }

        return NextResponse.json({ success: true, message: 'Event logged successfully' });
    } catch (error) {
        console.error('Event logging error:', error);

        // Log to observability_logs as fallback
        try {
            const db = getLocalDb();
            db.prepare('INSERT INTO observability_logs (level, message, source) VALUES (?, ?, ?)')
                .run('ERROR', error.message, 'api_events');
        } catch (e) {
            console.error('Critical Database connection failure:', e);
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
