import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { enqueuePageGeneration } from '@/lib/queue/publisher';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('generation_queue')
            .select('status');

        if (error) {
            throw error;
        }

        const summary = {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            paused: 0
        };

        (data || []).forEach((row) => {
            if (summary[row.status] !== undefined) {
                summary[row.status] += 1;
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                ...summary,
                total: Object.values(summary).reduce((sum, value) => sum + value, 0)
            }
        });
    } catch (error) {
        console.error('Queue API GET error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch generation queue'
        }, { status: 500 });
    }
});

export const POST = withAdminAuth(async (request) => {
    try {
        if (!process.env.QSTASH_TOKEN) {
            return NextResponse.json({
                success: false,
                error: 'QStash token is not configured for manual worker dispatch'
            }, { status: 500 });
        }

        const dispatch = await enqueuePageGeneration({
            source: 'admin_manual',
            triggered_by: request.headers.get('x-admin-user') || 'unknown'
        });

        if (!dispatch?.messageId) {
            return NextResponse.json({
                success: false,
                error: 'Queue trigger failed'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: dispatch
        });
    } catch (error) {
        console.error('Queue API POST error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to trigger generation worker'
        }, { status: 500 });
    }
});
