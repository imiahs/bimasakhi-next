import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request, user) => {
    try {
        const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
        const response = await fetch(`${origin}/api/jobs/retry-failed-leads`, {
            method: 'POST'
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: data.error || 'Retry worker failed'
            }, { status: response.status });
        }

        return NextResponse.json({
            success: true,
            ...data,
            data
        });
    } catch (error) {
        console.error('Retry failed-leads API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to trigger retry worker'
        }, { status: 500 });
    }
});
