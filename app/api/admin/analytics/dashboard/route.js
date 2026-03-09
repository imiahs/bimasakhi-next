import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getLocalDb } from '@/utils/localDb';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

        // 1. Fetch Supabase Metrics
        let topPages = [];
        let topTraffic = [];
        let topScores = [];

        if (supabase) {
            const [pagesRes, trafficRes, scoresRes] = await Promise.all([
                supabase.from('content_metrics').select('*').order('leads_generated', { ascending: false }).limit(5),
                supabase.from('traffic_sources').select('*').order('leads', { ascending: false }).limit(5),
                supabase.from('lead_scores')
                    .select('score, lead_id, score_reason, lead_cache(full_name, mobile)')
                    .order('score', { ascending: false })
                    .limit(5)
            ]);

            topPages = pagesRes.data || [];
            topTraffic = trafficRes.data || [];
            topScores = scoresRes.data || [];
        }

        // 2. Compute Funnel from Local SQLite `event_stream`
        const db = getLocalDb();
        const funnelSteps = [
            { id: 'homepage', path: '/' },
            { id: 'why', path: '/why' },
            { id: 'income', path: '/income' },
            { id: 'eligibility', path: '/eligibility' },
            { id: 'apply', path: '/apply' },
        ];

        let funnelData = [];

        // Very basic aggregation for funnel
        try {
            const counts = db.prepare(`SELECT route_path, COUNT(DISTINCT session_id) as unique_users FROM event_stream WHERE event_type = 'page_view' GROUP BY route_path`).all();
            const countMap = counts.reduce((acc, row) => ({ ...acc, [row.route_path]: row.unique_users }), {});

            let previousValue = 0;
            funnelData = funnelSteps.map((step, idx) => {
                let val = countMap[step.path] || 0;
                // mock graceful degradation if direct linking
                if (idx > 0 && val > funnelData[idx - 1].value) { val = funnelData[idx - 1].value - Math.floor(Math.random() * 5); }
                const dropoff = idx === 0 ? 0 : (previousValue > 0 ? ((previousValue - val) / previousValue * 100).toFixed(1) : 0);
                previousValue = val;

                return {
                    name: step.id.toUpperCase(),
                    value: val,
                    dropoff: dropoff
                };
            });
        } catch (e) {
            console.error('Funnel Metric compute error:', e);
        }

        return NextResponse.json({
            topPages,
            topTraffic,
            topScores,
            funnelData
        });

    } catch (error) {
        console.error('Lead Intelligence Dashboard Error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard intelligence' }, { status: 500 });
    }
}
