import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

function serializeError(error) {
    if (!error) return null;

    return {
        message: error.message || '',
        details: error.details || '',
        hint: error.hint || '',
        code: error.code || ''
    };
}

function isConvertedLead(row) {
    return Boolean(
        row?.is_converted === true ||
        row?.status === 'converted' ||
        row?.converted_at ||
        Number(row?.conversion_value || 0) > 0
    );
}

async function runCountQuery(label, query) {
    const result = await query();
    const error = serializeError(result?.error);
    const hasCount = typeof result?.count === 'number';
    const isFatal = Boolean(error && (
        error.message ||
        error.details ||
        error.hint ||
        error.code ||
        !hasCount
    ));

    return {
        label,
        count: hasCount ? result.count : 0,
        error,
        isFatal
    };
}

export const GET = withAdminAuth(async () => {
    try {
        const supabase = getServiceSupabase();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalRes = await runCountQuery('total_leads', () => (
            supabase
                .from('leads')
                .select('id', { count: 'exact' })
                .limit(1)
        ));

        const conversionRes = await runCountQuery('conversions', () => (
            supabase
                .from('leads')
                .select('id', { count: 'exact' })
                .not('zoho_lead_id', 'is', null)
                .limit(1)
        ));

        const todayRes = await runCountQuery('today_leads', () => (
            supabase
                .from('leads')
                .select('id', { count: 'exact' })
                .gte('created_at', today.toISOString())
                .limit(1)
        ));

        const activePagesRes = await runCountQuery('active_pages', () => (
            supabase
                .from('page_index')
                .select('id', { count: 'exact' })
                .eq('status', 'active')
                .limit(1)
        ));

        const queuePendingRes = await runCountQuery('queue_pending', () => (
            supabase
                .from('generation_queue')
                .select('id', { count: 'exact' })
                .eq('status', 'pending')
                .limit(1)
        ));

        const queueTotalRes = await runCountQuery('queue_total', () => (
            supabase
                .from('generation_queue')
                .select('id', { count: 'exact' })
                .limit(1)
        ));

        const requiredErrors = [
            totalRes,
            conversionRes,
            todayRes,
            activePagesRes,
            queuePendingRes,
            queueTotalRes
        ].filter((item) => item.isFatal);

        if (requiredErrors.length > 0) {
            console.error('Metrics API required query failure:', requiredErrors);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch required metrics',
                details: requiredErrors.map((item) => ({
                    query: item.label,
                    ...item.error
                }))
            }, { status: 500 });
        }

        const total = totalRes.count;
        const conversions = conversionRes.count;
        const todayLeads = todayRes.count;
        const activePages = activePagesRes.count;
        const queuePending = queuePendingRes.count;
        const queueTotal = queueTotalRes.count;

        let distributionRows = [];
        const distributionRes = await supabase
            .from('leads')
            .select('source, city, status, converted_at, conversion_value')
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
            if (!isConvertedLead(row)) return sum;
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
