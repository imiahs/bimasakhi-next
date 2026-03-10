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
            return NextResponse.json({ error: 'Supabase required for AI Recruiter.' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        // Fetch top recent unscored leads
        const { data: recentLeads, error: leadsErr } = await supabase
            .from('lead_scores')
            .select(`
                lead_id,
                score,
                score_reason,
                lead_cache (full_name, mobile, email, status)
            `)
            .order('score', { ascending: false })
            .limit(5);

        if (leadsErr) throw leadsErr;

        if (!recentLeads || recentLeads.length === 0) {
            return NextResponse.json({ success: true, message: 'No leads available for prediction.', predictions: [] });
        }

        const predictions = [];

        for (const lead of recentLeads) {
            // Check if prediction already exists recently to avoid spam API calls
            const { data: existing } = await supabase
                .from('lead_predictions')
                .select('*')
                .eq('lead_id', lead.lead_id)
                .order('generated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Only generate new if older than a day, or doesn't exist
            let shouldGenerate = false;
            if (!existing) {
                shouldGenerate = true;
            } else {
                const ageHours = (new Date() - new Date(existing.generated_at)) / (1000 * 60 * 60);
                if (ageHours > 24) shouldGenerate = true;
            }

            if (shouldGenerate) {
                const systemPrompt = "You are the Bima Sakhi AI Recruitment Assistant. Analyze the lead's score and context relative to an insurance agency recruitment pipeline. Output ONLY a valid JSON object strictly matching this schema: { \"conversion_probability\": number between 0 and 100, \"recommended_action\": \"string detailing EXACTLY how the admin should follow up\" }. Do not output markdown code blocks or any other conversational text.";
                const userPrompt = `Lead Name: ${lead.lead_cache?.full_name}\nScore: ${lead.score}\nReason: ${lead.score_reason}\nStatus: ${lead.lead_cache?.status}`;

                try {
                    const aiResponse = await generateAiContent(systemPrompt, userPrompt);
                    console.log("Raw AI Response:", aiResponse);

                    // Simple cleansing for potential markdown wrapping
                    let cleanJsonStr = aiResponse.trim();
                    if (cleanJsonStr.startsWith('```json')) {
                        cleanJsonStr = cleanJsonStr.substring(7, cleanJsonStr.length - 3).trim();
                    } else if (cleanJsonStr.startsWith('```')) {
                        cleanJsonStr = cleanJsonStr.substring(3, cleanJsonStr.length - 3).trim();
                    }

                    const parsed = JSON.parse(cleanJsonStr);

                    const { data: inserted, error: insertErr } = await supabase.from('lead_predictions').insert({
                        lead_id: lead.lead_id,
                        conversion_probability: parsed.conversion_probability,
                        recommended_action: parsed.recommended_action
                    }).select().single();

                    if (!insertErr && inserted) {
                        predictions.push({ ...inserted, lead: lead.lead_cache });
                    }
                } catch (aiErr) {
                    console.error("Failed to generate prediction for lead", lead.lead_id, aiErr);
                }
            } else {
                predictions.push({ ...existing, lead: lead.lead_cache });
            }
        }

        return NextResponse.json({ success: true, predictions });

    } catch (error) {
        console.error('AI Recruiter Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ predictions: [] });
        }

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('lead_predictions')
            .select(`
                id,
                conversion_probability,
                recommended_action,
                generated_at,
                lead_id,
                leads (
                    id,
                    full_name,
                    mobile,
                    status,
                    city
                )
            `)
            .order('generated_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        // Handle relation mapping since it could be lead_cache or leads depending on schema setup. We used referencing `leads` table in phase 20 schema. Let's ensure it's structured nicely.

        return NextResponse.json({ predictions: data });
    } catch (err) {
        console.error("Error fetching predictions:", err);
        return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
    }
});
