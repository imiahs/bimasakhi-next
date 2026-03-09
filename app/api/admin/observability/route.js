import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = getServiceSupabase();

        // Read directly from the snapshot as requested
        const { data, error } = await supabase
            .from('system_metrics_snapshot')
            .select('*')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore 0 rows error
            throw error;
        }

        return NextResponse.json({
            success: true,
            snapshot: data || {
                jobs_processed: 0,
                jobs_failed: 0,
                redis_latency_ms: 0,
                supabase_latency_ms: 0,
                queue_depth: 0,
                worker_uptime: 0,
                error_rate: 0
            }
        });
    } catch (error) {
        console.error('Failed to fetch observability snapshot:', error);
        return NextResponse.json({ success: false, error: 'Database timeout' }, { status: 500 });
    }
}
