import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({
                rules: [
                    { condition_type: 'read_blog', condition_value: '/blog', cta_component: 'CalculatorCTA' },
                    { condition_type: 'used_calculator', condition_value: '/tools', cta_component: 'ApplyCTA' }
                ]
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
            .from('cta_rules')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;

        return NextResponse.json({ rules: data });
    } catch (error) {
        console.error('Smart CTA Fetch Error:', error);
        return NextResponse.json({
            rules: [
                { condition_type: 'read_blog', condition_value: '/blog', cta_component: 'CalculatorCTA' },
                { condition_type: 'used_calculator', condition_value: '/tools', cta_component: 'ApplyCTA' }
            ]
        });
    }
}
