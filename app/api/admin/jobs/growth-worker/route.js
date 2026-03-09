import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAiContent } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ error: 'Supabase required for Growth Reports' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const [metricsRes, trafficRes] = await Promise.all([
            supabase.from('content_metrics').select('*').order('leads_generated', { ascending: false }),
            supabase.from('traffic_sources').select('*').order('leads', { ascending: false })
        ]);

        const metrics = metricsRes.data || [];
        const traffic = trafficRes.data || [];

        const topContent = metrics[0]?.target_path || 'None recorded';
        const worstContent = metrics[metrics.length - 1]?.target_path || 'None recorded';
        const topSource = traffic[0]?.source || 'None recorded';

        const systemPrompt = "Analyze the recent growth metrics and formulate a 3 sentence executive summary discussing best performing traffic sources and any content optimization recommendations.";
        const userPrompt = `Content Metrics:\n${JSON.stringify(metrics.slice(0, 5))}\nTraffic:\n${JSON.stringify(traffic.slice(0, 5))}`;

        let aiSummary = "Summary not generated: No AI Provider.";
        try {
            aiSummary = await generateAiContent(systemPrompt, userPrompt);
        } catch (e) {
            console.error('AI Summary Generation Error:', e);
        }

        const { error: insertErr } = await supabase.from('growth_reports').insert({
            top_source: topSource,
            top_content: topContent,
            worst_content: worstContent,
            ai_summary: aiSummary
        });

        if (insertErr) throw insertErr;

        return NextResponse.json({ success: true, message: 'Growth report created successfully.' });
    } catch (error) {
        console.error('Growth Worker Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
