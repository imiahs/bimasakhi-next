import { NextResponse } from 'next/server';
import { getLocalDb } from '@/utils/localDb';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = getLocalDb();

        // Count logic grouping by Event Types
        const eventCountsRow = db.prepare(`
            SELECT event_type, COUNT(*) as count 
            FROM event_stream 
            GROUP BY event_type
        `).all();

        const eventStats = {
            scroll_depth: 0,
            form_submission: 0,
            calculator_used: 0,
            resource_downloaded: 0,
            page_view: 0
        };

        eventCountsRow.forEach(row => {
            if (row.event_type in eventStats) {
                eventStats[row.event_type] = row.count;
            } else {
                eventStats[row.event_type] = row.count; // Capture unexpected events dynamically
            }
        });

        // Get Top Paths based on Traffic
        const topPathsRow = db.prepare(`
            SELECT route_path, COUNT(*) as count 
            FROM event_stream 
            GROUP BY route_path
            ORDER BY count DESC
            LIMIT 5
        `).all();

        // Get recent event feed limit 20
        const recentEvents = db.prepare(`
            SELECT * 
            FROM event_stream 
            ORDER BY created_at DESC 
            LIMIT 20
        `).all();

        return NextResponse.json({ success: true, eventStats, topPaths: topPathsRow, recentFeed: recentEvents });
    } catch (error) {
        console.error('API /admin/events GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch event telemetry' }, { status: 500 });
    }
}
