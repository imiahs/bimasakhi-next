import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAiContent } from '@/lib/ai';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ error: 'Supabase required for AI Content Engine.' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch top and bottom performing content
        const { data: metrics } = await supabase
            .from('content_metrics')
            .select('*')
            .order('leads_generated', { ascending: false })
            .limit(20);

        if (!metrics || metrics.length === 0) {
            return NextResponse.json({ success: true, message: 'No metrics available to analyze.', recommendations: [] });
        }

        // Send to AI for deep analysis
        const systemPrompt = "You are the Bima Sakhi AI Content Optimization Engine. Analyze the following content metrics (views vs leads generated). Output exactly 3 specific recommendations mapping to specific target_paths. Output ONLY a valid JSON array of objects strictly matching this schema: [ { \"target_path\": \"string path evaluated\", \"recommendation_type\": \"expand_topic or fix_dropoff\", \"ai_suggestion\": \"Detailed strategy\" } ]. Do not include markdown codeblocks or conversational text.";
        const userPrompt = `Content Metrics:\n${JSON.stringify(metrics, null, 2)}`;

        const recommendations = [];

        try {
            const aiResponse = await generateAiContent(systemPrompt, userPrompt);

            let cleanJsonStr = aiResponse.trim();
            if (cleanJsonStr.startsWith('```json')) cleanJsonStr = cleanJsonStr.substring(7, cleanJsonStr.length - 3).trim();
            else if (cleanJsonStr.startsWith('```')) cleanJsonStr = cleanJsonStr.substring(3, cleanJsonStr.length - 3).trim();

            const parsed = JSON.parse(cleanJsonStr);

            for (const rec of parsed) {
                const { data: inserted, error: insertErr } = await supabase.from('content_recommendations').insert({
                    target_path: rec.target_path,
                    recommendation_type: rec.recommendation_type,
                    ai_suggestion: rec.ai_suggestion
                }).select().single();

                if (!insertErr && inserted) recommendations.push(inserted);
            }
        } catch (aiErr) {
            console.error("Content Recommendation AI Error:", aiErr);
        }

        return NextResponse.json({ success: true, recommendations });

    } catch (error) {
        console.error('AI Content Engine Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ recommendations: [] });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('content_recommendations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        return NextResponse.json({ recommendations: data });
    } catch (err) {
        console.error("Error fetching content recommendations:", err);
        return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
    }
});
