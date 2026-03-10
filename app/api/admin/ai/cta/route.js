import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { generateAiContent } from '@/lib/ai';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ error: 'Supabase required for CTA Engine.' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { data: analyses } = await supabase.from('landing_page_analysis').select('*').order('analyzed_at', { ascending: false }).limit(5);

        if (!analyses || analyses.length === 0) {
            return NextResponse.json({ success: true, message: 'No landing analyses available.', recommendations: [] });
        }

        const systemPrompt = "You are the Bima Sakhi AI CTA Optimizer. Analyze landing page drop-offs and suggest new dynamic Call-To-Action rules to improve conversion rates. Output an array of valid JSON objects exactly matching: [ { \"condition_type\": \"e.g. read_blog, high_bounce\", \"condition_value\": \"the path causing dropoff\", \"suggested_cta_component\": \"Button component to shift to, like ApplyCTA or CalculatorCTA\", \"reasoning\": \"string logic\" } ]";
        const userPrompt = `Context:\n${JSON.stringify(analyses, null, 2)}`;

        const recommendations = [];

        try {
            const aiResponse = await generateAiContent(systemPrompt, userPrompt);

            let clean = aiResponse.trim();
            if (clean.startsWith('```json')) clean = clean.substring(7, clean.length - 3).trim();
            else if (clean.startsWith('```')) clean = clean.substring(3, clean.length - 3).trim();
            const parsed = JSON.parse(clean);

            for (const rec of parsed) {
                const { data: inserted, error: insertErr } = await supabase.from('cta_recommendations').insert({
                    condition_type: rec.condition_type,
                    condition_value: rec.condition_value,
                    suggested_cta_component: rec.suggested_cta_component,
                    reasoning: rec.reasoning
                }).select().single();

                if (!insertErr && inserted) recommendations.push(inserted);
            }
        } catch (aiErr) {
            console.error("CTA Recommendation AI Error:", aiErr);
        }

        return NextResponse.json({ success: true, recommendations });

    } catch (error) {
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

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('cta_recommendations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        return NextResponse.json({ recommendations: data });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
    }
});
