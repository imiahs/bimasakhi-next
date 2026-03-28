import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

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

        const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
        const response = await fetch(`${origin}/api/jobs/pagegen`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: data.error || 'Queue trigger failed'
            }, { status: response.status });
        }

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Queue API POST error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to trigger generation worker'
        }, { status: 500 });
    }
});
