import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        // 1. Fetch live metrics from page_index
        const { data: pageIndexData, error: pageError } = await supabase
            .from('page_index')
            .select('status, crawl_priority');

        if (pageError) throw pageError;

        let indexed = 0;
        let pending = 0;
        let noindex = 0;

        // Priority distributions
        let pHigh = 0;
        let pMedium = 0;
        let pLow = 0;

        pageIndexData.forEach(row => {
            if (row.status === 'active') indexed++;
            if (row.status === 'pending_index') pending++;
            if (row.status === 'disabled' || row.status === 'noindex') noindex++;

            if (row.crawl_priority === 'high') pHigh++;
            else if (row.crawl_priority === 'low') pLow++;
            else pMedium++;
        });

        // 1.5. Fetch Orphan Pages
        const { count: orphanCount } = await supabase
            .from('seo_growth_recommendations')
            .select('*', { count: 'exact', head: true })
            .eq('recommendation_type', 'ORPHAN_PAGE');

        // 2. Fetch or update the snapshot
        const snapshotUpdates = {
            indexed_pages: indexed,
            pending_pages: pending,
            noindex_pages: noindex,
            priority_high: pHigh,
            priority_medium: pMedium,
            priority_low: pLow,
            orphan_pages: orphanCount || 0,
            updated_at: new Date().toISOString()
        };

        const { data: metrics, error: metricsError } = await supabase
            .from('search_index_metrics')
            .upsert([{ id: 1, ...snapshotUpdates }])
            .select()
            .single();

        if (metricsError) throw metricsError;

        return NextResponse.json({ success: true, metrics });
    } catch (error) {
        console.error('Failed to fetch index health:', error);
        return NextResponse.json({ success: false, error: 'Database timeout' }, { status: 500 });
    }
});
