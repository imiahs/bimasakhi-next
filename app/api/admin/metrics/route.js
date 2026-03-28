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
            queueRes
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
                .from('generation_queue')
                .select('status')
        ]);

        const requiredErrors = [
            totalRes.error,
            conversionRes.error,
            todayRes.error,
            activePagesRes.error,
            queueRes.error
        ].filter(Boolean);

        if (requiredErrors.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch required metrics',
                details: requiredErrors.map((err) => err.message || String(err))
            }, { status: 500 });
        }

        const total = totalRes.count || 0;
        const conversions = conversionRes.count || 0;
        const todayLeads = todayRes.count || 0;
        const activePages = activePagesRes.count || 0;
        const queueRows = queueRes.data || [];
        const queuePending = queueRows.filter((row) => row.status === 'pending').length;
        const queueTotal = queueRows.length;

        let distributionRows = [];
        const distributionRes = await supabase
            .from('leads')
            .select('source, city, conversion_value, is_converted')
            .order('created_at', { ascending: false })
            .limit(500);

        if (!distributionRes.error) {
            distributionRows = distributionRes.data || [];
        } else {
            console.error('Metrics API distribution query error:', distributionRes.error);
        }

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
                queue_pending: queuePending,
                queue_total: queueTotal,
                estimated_revenue: estimatedRevenue,
                top_sources: buildTopList(distributionRows, 'source', 'Website'),
                top_cities: buildTopList(distributionRows, 'city', 'Unknown')
            }
        });

    } catch (error) {
        console.error('Metrics API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch metrics'
        }, { status: 500 });
    }
});
