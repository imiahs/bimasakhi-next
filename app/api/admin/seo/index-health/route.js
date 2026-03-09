import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = getServiceSupabase();

        // 1. Fetch live metrics from page_index
        const { data: pageIndexData, error: pageError } = await supabase
            .from('page_index')
            .select('status');

        if (pageError) throw pageError;

        let indexed = 0;
        let pending = 0;
        let noindex = 0;

        pageIndexData.forEach(row => {
            if (row.status === 'active') indexed++;
            if (row.status === 'pending_index') pending++;
            if (row.status === 'disabled' || row.status === 'noindex') noindex++;
        });

        // 2. Fetch or update the snapshot
        const snapshotUpdates = {
            indexed_pages: indexed,
            pending_pages: pending,
            noindex_pages: noindex,
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
}
