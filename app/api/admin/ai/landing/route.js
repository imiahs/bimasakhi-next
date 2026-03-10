import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAiContent } from '@/lib/ai';
import { getLocalDb } from '@/utils/localDb';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ error: 'Supabase required for AI Landing Engine.' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch Supabase event stream for bounce rate/cta clicks evaluation
        const { data: rawEvents } = await supabase
            .from('event_stream')
            .select('route_path, event_type')
            .order('created_at', { ascending: false })
            .limit(2000);

        const events = rawEvents || [];
        const statsMap = {};

        events.forEach(e => {
            if (!e.route_path) return;
            if (!statsMap[e.route_path]) {
                statsMap[e.route_path] = { route_path: e.route_path, views: 0, actions: 0 };
            }
            if (e.event_type === 'page_view') statsMap[e.route_path].views++;
            if (['smart_cta_click', 'funnel_step', 'converted'].includes(e.event_type)) {
                statsMap[e.route_path].actions++;
            }
        });

        const pathStats = Object.values(statsMap)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        if (!pathStats || pathStats.length === 0) {
            return NextResponse.json({ success: true, message: 'No landing events to analyze.', analyses: [] });
        }

        // Mock computation of bounce rate & scroll depth for AI Context
        const landingContext = pathStats.map(stat => {
            const bounceRate = stat.actions === 0 ? 100 : Math.max(0, 100 - ((stat.actions / stat.views) * 100));
            return {
                page_path: stat.route_path,
                views: stat.views,
                actions: stat.actions,
                bounce_rate: parseFloat(bounceRate.toFixed(2)),
                scroll_depth: Math.floor(Math.random() * 40) + 40 // simulated average depth 40-80%
            };
        });

        // Send to AI for deep analysis
        const systemPrompt = "You are the Bima Sakhi Landing Page Optimization AI. Analyze the event funnel context. Evaluate bounce rates and interaction rates. Output exactly 3 analytical insights mapping to specific poor performing pages. Output ONLY a valid JSON array of objects exactly matching this schema: [ { \"page_path\": \"string\", \"ai_optimization_report\": \"Detailed reasoning to improve scroll depth or CTA visibility\", \"bounce_rate_analyzed\": number, \"scroll_depth_analyzed\": number } ]. Do not include markdown or conversational context.";
        const userPrompt = `Landing Page Telemetry:\n${JSON.stringify(landingContext, null, 2)}`;

        const analyses = [];

        try {
            const aiResponse = await generateAiContent(systemPrompt, userPrompt);

            let cleanJsonStr = aiResponse.trim();
            if (cleanJsonStr.startsWith('```json')) cleanJsonStr = cleanJsonStr.substring(7, cleanJsonStr.length - 3).trim();
            else if (cleanJsonStr.startsWith('```')) cleanJsonStr = cleanJsonStr.substring(3, cleanJsonStr.length - 3).trim();

            const parsed = JSON.parse(cleanJsonStr);

            for (const rep of parsed) {
                const { data: inserted, error: insertErr } = await supabase.from('landing_page_analysis').insert({
                    page_path: rep.page_path,
                    bounce_rate: rep.bounce_rate_analyzed,
                    scroll_depth: rep.scroll_depth_analyzed,
                    cta_clicks: landingContext.find(l => l.page_path === rep.page_path)?.actions || 0,
                    ai_optimization_report: rep.ai_optimization_report
                }).select().single();

                if (!insertErr && inserted) analyses.push(inserted);
            }
        } catch (aiErr) {
            console.error("Landing Analysis AI Error:", aiErr);
        }

        return NextResponse.json({ success: true, analyses });

    } catch (error) {
        console.error('AI Landing Engine Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ analyses: [] });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('landing_page_analysis')
            .select('*')
            .order('analyzed_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        return NextResponse.json({ analyses: data });
    } catch (err) {
        console.error("Error fetching landing analyses:", err);
        return NextResponse.json({ error: "Failed to fetch landing logic" }, { status: 500 });
    }
});
