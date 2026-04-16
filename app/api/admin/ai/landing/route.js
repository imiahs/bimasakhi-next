import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { generateAiContent } from '@/lib/ai';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getEventRoutePath } from '@/lib/events/routePath';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async () => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ error: 'Supabase required for AI Landing Engine.' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { data: rawEvents } = await supabase
            .from('event_stream')
            .select('event_name, payload, route_path, event_type')
            .order('created_at', { ascending: false })
            .limit(2000);

        const statsMap = {};
        for (const event of rawEvents || []) {
            const routePath = getEventRoutePath(event);
            if (!routePath) continue;

            if (!statsMap[routePath]) {
                statsMap[routePath] = { route_path: routePath, views: 0, actions: 0 };
            }

            if (event.event_type === 'page_view') statsMap[routePath].views++;
            if (['smart_cta_click', 'funnel_step', 'converted'].includes(event.event_type)) {
                statsMap[routePath].actions++;
            }
        }

        const pathStats = Object.values(statsMap)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        if (pathStats.length === 0) {
            return NextResponse.json({ success: true, message: 'No landing events to analyze.', analyses: [] });
        }

        const landingContext = pathStats.map((stat) => ({
            page_path: stat.route_path,
            views: stat.views,
            actions: stat.actions,
            interaction_gap: stat.views > 0
                ? parseFloat((100 - ((stat.actions / stat.views) * 100)).toFixed(2))
                : null,
            scroll_depth: null
        }));

        const systemPrompt = 'You are the Bima Sakhi Landing Page Optimization AI. Analyze the event funnel context using interaction gaps, not fabricated bounce rates. Output exactly 3 analytical insights mapping to specific low-performing pages. Output ONLY a valid JSON array of objects exactly matching this schema: [ { "page_path": "string", "ai_optimization_report": "Detailed reasoning to improve CTA visibility or message clarity", "interaction_gap_analyzed": number, "scroll_depth_analyzed": null } ]. Do not include markdown or conversational context.';
        const userPrompt = `Landing Page Telemetry:\n${JSON.stringify(landingContext, null, 2)}`;

        try {
            const aiResponse = await generateAiContent(systemPrompt, userPrompt);
            let cleanJsonStr = aiResponse.trim();
            if (cleanJsonStr.startsWith('```json')) cleanJsonStr = cleanJsonStr.substring(7, cleanJsonStr.length - 3).trim();
            else if (cleanJsonStr.startsWith('```')) cleanJsonStr = cleanJsonStr.substring(3, cleanJsonStr.length - 3).trim();

            const parsed = JSON.parse(cleanJsonStr);
            const analyses = [];

            for (const report of parsed) {
                const { data: inserted, error: insertErr } = await supabase.from('landing_page_analysis').insert({
                    page_path: report.page_path,
                    bounce_rate: report.interaction_gap_analyzed,
                    scroll_depth: null,
                    cta_clicks: landingContext.find((entry) => entry.page_path === report.page_path)?.actions || 0,
                    ai_optimization_report: report.ai_optimization_report
                }).select().single();

                if (!insertErr && inserted) {
                    analyses.push(inserted);
                }
            }

            return NextResponse.json({ success: true, analyses, raw_telemetry: landingContext });
        } catch (aiErr) {
            console.error('Landing Analysis AI Error:', aiErr);
            return NextResponse.json({
                success: true,
                message: 'AI analysis unavailable. Returning raw telemetry only.',
                analyses: [],
                raw_telemetry: landingContext
            });
        }
    } catch (error) {
        console.error('AI Landing Engine Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});

export const GET = withAdminAuth(async () => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ analyses: [] });
        }

        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('landing_page_analysis')
            .select('*')
            .order('analyzed_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        return NextResponse.json({ analyses: data });
    } catch (err) {
        console.error('Error fetching landing analyses:', err);
        return NextResponse.json({ error: 'Failed to fetch landing logic' }, { status: 500 });
    }
});
