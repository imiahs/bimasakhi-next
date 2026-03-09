import { NextResponse } from 'next/server';
import { getLocalDb } from '@/utils/localDb';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = getLocalDb();

        // Fetch last 50 system errors from local SQLite DB
        const errors = db.prepare('SELECT * FROM system_errors ORDER BY created_at DESC LIMIT 50').all();

        return NextResponse.json({ success: true, errors });
    } catch (error) {
        console.error('API /admin/errors GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch system errors', details: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const payload = await request.json();
        const { layer, message, stack_trace, source } = payload;

        const db = getLocalDb();
        const stmt = db.prepare(`
            INSERT INTO system_errors (layer, message, stack_trace, source) 
            VALUES (?, ?, ?, ?)
        `);

        stmt.run(
            layer || 'UNKNOWN',
            message || 'No message provided',
            stack_trace || '',
            source || 'SYSTEM'
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const payload = await request.json();
        const { id, resolved } = payload;

        if (!id) return NextResponse.json({ error: 'Missing error ID' }, { status: 400 });

        const db = getLocalDb();
        const stmt = db.prepare('UPDATE system_errors SET resolved = ? WHERE id = ?');
        stmt.run(resolved ? 1 : 0, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update error status' }, { status: 500 });
    }
}
