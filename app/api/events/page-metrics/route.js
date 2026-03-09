import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { page_id, action, scroll_depth } = await request.json();

        if (!page_id || !action) {
            return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ success: true, message: 'Supabase disabled, skipping metrics tracking.' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch current metrics
        const { data: metrics } = await supabase.from('page_metrics').select('*').eq('page_id', page_id).maybeSingle();

        let updatePayload = {};

        if (!metrics) {
            updatePayload = {
                page_id,
                views: action === 'page_view' ? 1 : 0,
                cta_clicks: action === 'cta_click' ? 1 : 0,
                form_submissions: action === 'form_submission' ? 1 : 0,
                average_scroll_depth: scroll_depth || 0
            };
            await supabase.from('page_metrics').insert(updatePayload);
        } else {
            // Calculate rolling averages and counters
            if (action === 'page_view') {
                updatePayload.views = metrics.views + 1;
                if (scroll_depth) {
                    const currentAvg = metrics.average_scroll_depth || 0;
                    updatePayload.average_scroll_depth = ((currentAvg * metrics.views) + scroll_depth) / (metrics.views + 1);
                }
            } else if (action === 'cta_click') {
                updatePayload.cta_clicks = metrics.cta_clicks + 1;
            } else if (action === 'form_submission') {
                updatePayload.form_submissions = metrics.form_submissions + 1;
            }

            updatePayload.last_computed_at = new Date().toISOString();

            await supabase.from('page_metrics').update(updatePayload).eq('page_id', page_id);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        // Silently fail to avoiding crashing users
        console.error("Page Metric Tracking Error:", error);
        return NextResponse.json({ success: false, error: 'Metric log failed' });
    }
}
