import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ success: true, eventStats: {}, topPaths: [], recentFeed: [] });
        }

        const supabase = getServiceSupabase();

        // Fetch recent 1000 events for in-memory grouping (to avoid N+1 or requiring RPC)
        const { data: recentEventsRaw, error } = await supabase
            .from('event_stream')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

        const events = recentEventsRaw || [];

        const eventStats = {
            scroll_depth: 0,
            form_submission: 0,
            calculator_used: 0,
            resource_downloaded: 0,
            page_view: 0,
            smart_cta_click: 0
        };

        const pathCounts = {};

        events.forEach(row => {
            // Count by event type
            if (row.event_type in eventStats) eventStats[row.event_type]++;
            else eventStats[row.event_type] = 1;

            // Count by path
            if (row.route_path) {
                pathCounts[row.route_path] = (pathCounts[row.route_path] || 0) + 1;
            }
        });

        const topPathsRow = Object.keys(pathCounts)
            .map(path => ({ route_path: path, count: pathCounts[path] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const recentFeed = events.slice(0, 20);

        return NextResponse.json({ success: true, eventStats, topPaths: topPathsRow, recentFeed });
    } catch (error) {
        console.error('API /admin/events GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch event telemetry' }, { status: 500 });
    }
});
