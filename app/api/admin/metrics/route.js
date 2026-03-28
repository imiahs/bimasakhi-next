import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
    try {
        const supabase = getServiceSupabase();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalRes,
            conversionRes,
            todayRes,
            activePagesRes,
            distributionRes
        ] = await Promise.all([
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true }),
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('is_converted', true),
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', today.toISOString()),
            supabase
                .from('page_index')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'active'),
            supabase
                .from('leads')
                .select('source, city, conversion_value, is_converted')
        ]);

        const firstError =
            totalRes.error ||
            conversionRes.error ||
            todayRes.error ||
            activePagesRes.error ||
            distributionRes.error;

        if (firstError) {
            throw firstError;
        }

        const total = totalRes.count || 0;
        const conversions = conversionRes.count || 0;
        const todayLeads = todayRes.count || 0;
        const activePages = activePagesRes.count || 0;
        const distributionRows = distributionRes.data || [];

        const buildTopList = (rows, key, fallback) => {
            const counts = new Map();

            rows.forEach((row) => {
                const value = row[key] || fallback;
                counts.set(value, (counts.get(value) || 0) + 1);
            });

            return Array.from(counts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, value]) => ({ name, value }));
        };

        const estimatedRevenue = distributionRows.reduce((sum, row) => {
            if (!row.is_converted) return sum;
            return sum + Number(row.conversion_value || 0);
        }, 0);

        return NextResponse.json({
            success: true,
            data: {
                total_leads: total,
                today_leads: todayLeads,
                conversions: conversions,
                converted_leads: conversions,
                conversion_rate: total > 0 ? (conversions / total) * 100 : 0,
                active_pages: activePages,
                estimated_revenue: estimatedRevenue,
                top_sources: buildTopList(distributionRows, 'source', 'Website'),
                top_cities: buildTopList(distributionRows, 'city', 'Unknown')
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
                converted_leads: 0,
                conversion_rate: 0,
                active_pages: 0,
                estimated_revenue: 0,
                top_sources: [],
                top_cities: []
            }
        });
    }
});
