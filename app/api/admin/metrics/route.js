import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
    try {
        const supabase = getServiceSupabase();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalRes = await supabase
            .from('lead_queue')
            .select('id', { count: 'exact', head: true });

        const conversionRes = await supabase
            .from('lead_queue')
            .select('id', { count: 'exact', head: true })
            .eq('synced_to_zoho', true);

        const todayRes = await supabase
            .from('lead_queue')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        const total = totalRes.count || 0;
        const conversions = conversionRes.count || 0;
        const todayLeads = todayRes.count || 0;

        return NextResponse.json({
            success: true,
            data: {
                total_leads: total,
                today_leads: todayLeads,
                conversions: conversions,
                conversion_rate: total > 0 ? (conversions / total) * 100 : 0,
                active_pages: 0
            }
        });

    } catch (error) {
        console.error('Metrics API error:', error);
        return NextResponse.json({
            success: true,
            data: {
                total_leads: 0,
                today_leads: 0,
                conversions: 0,
                conversion_rate: 0,
                active_pages: 0
            }
        });
    }
});
