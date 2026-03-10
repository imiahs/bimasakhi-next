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
            return NextResponse.json({ error: 'Supabase must be enabled to generate full insights.' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch analytical aggregates
        const { data: metrics } = await supabase.from('content_metrics').select('*').order('leads_generated', { ascending: false }).limit(10);
        const { data: traffic } = await supabase.from('traffic_sources').select('*').order('leads', { ascending: false }).limit(10);

        // Fetch raw event behaviors from Supabase
        const { data: recentEvents } = await supabase
            .from('event_stream')
            .select('event_type')
            .order('created_at', { ascending: false })
            .limit(1000);

        const freqMap = {};
        (recentEvents || []).forEach(e => {
            freqMap[e.event_type] = (freqMap[e.event_type] || 0) + 1;
        });

        const eventCounts = Object.keys(freqMap)
            .map(type => ({ event_type: type, count: freqMap[type] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const analyticalContext = {
            top_content_metrics: metrics || [],
            top_traffic_sources: traffic || [],
            event_frequency: eventCounts || []
        };

        const systemPrompt = `You are the Bima Sakhi AI Growth Engine. Analyze the provided conversion telemetry.
Identify which content pieces drive the most leads, which traffic sources are most effective, and pinpoint any severe friction or drop-off metrics indicated by heavy page views but low conversion rates. Formulate three distinct Insights.`;

        const userPrompt = `Here is the current system telemetry: \n${JSON.stringify(analyticalContext, null, 2)}`;

        const generatedInsightsText = await generateAiContent(systemPrompt, userPrompt);

        // For structural extraction, assume the AI returned a paragraph we just store as insight type "growth_summary"
        const { data, error } = await supabase.from('lead_insights').insert({
            insight_type: 'growth_summary',
            content: generatedInsightsText
        }).select().single();

        if (error) throw error;

        return NextResponse.json({ success: true, insight: data });
    } catch (error) {
        console.error('AI Insight Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate Lead Insights' }, { status: 500 });
    }
});
