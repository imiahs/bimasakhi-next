import { NextResponse } from 'next/server';
import { getLocalDb } from '@/utils/localDb';

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
