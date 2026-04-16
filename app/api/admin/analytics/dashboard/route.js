import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getLocalDb } from '@/utils/localDb';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getEventRoutePath } from '@/lib/events/routePath';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = (supabaseUrl && supabaseKey) ? getServiceSupabase() : null;

        // 1. Fetch Supabase Metrics
        let topPages = [];
        let topTraffic = [];
        let topScores = [];

        if (supabase) {
            const [pagesRes, trafficRes, scoresRes] = await Promise.all([
                supabase.from('content_metrics').select('*').order('leads_generated', { ascending: false }).limit(5),
                supabase.from('traffic_sources').select('*').order('leads', { ascending: false }).limit(5),
                supabase.from('lead_scores')
                    .select('score, lead_id, score_reason, leads(full_name, mobile)')
                    .order('score', { ascending: false })
                    .limit(5)
            ]);

            topPages = pagesRes.data || [];
            topTraffic = trafficRes.data || [];
            topScores = (scoresRes.data || []).map((row) => ({
                ...row,
                lead_cache: row.leads
            }));
        }

        // 2. Compute Funnel from Supabase `event_stream`
        const funnelSteps = [
            { id: 'homepage', path: '/' },
            { id: 'why', path: '/why' },
            { id: 'income', path: '/income' },
            { id: 'eligibility', path: '/eligibility' },
            { id: 'apply', path: '/apply' },
        ];

        let funnelData = [];

        try {
            // Fetch recent page_view events for funnel
            let countsData = [];
            if (supabase) {
                const { data } = await supabase
                    .from('event_stream')
                    .select('event_name, payload, route_path, session_id')
                    .eq('event_type', 'page_view')
                    .order('created_at', { ascending: false })
                    .limit(5000);
                countsData = data || [];
            }

            // Group by canonical route path and unique session_id
            const uniqueSessions = {};
            countsData.forEach(row => {
                const routePath = getEventRoutePath(row);
                if (!routePath) {
                    return;
                }

                if (!uniqueSessions[routePath]) {
                    uniqueSessions[routePath] = new Set();
                }
                uniqueSessions[routePath].add(row.session_id);
            });

            const countMap = {};
            Object.keys(uniqueSessions).forEach(path => {
                countMap[path] = uniqueSessions[path].size;
            });

            // Build funnel from REAL data only — no synthetic shaping
            funnelData = funnelSteps.map((step, idx) => {
                const val = countMap[step.path] || 0;
                const previousValue = idx > 0 ? funnelData[idx - 1].value : 0;
                const dropoff = idx === 0 ? 0 : (previousValue > 0 ? ((previousValue - val) / previousValue * 100).toFixed(1) : 0);

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
});
