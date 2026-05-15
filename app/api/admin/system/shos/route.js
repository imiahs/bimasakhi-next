import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getShosSnapshot, performShosAction } from '@/lib/system/shos';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request) => {
    try {
        const { searchParams } = new URL(request.url);
        const snapshot = await getShosSnapshot({
            dlqLimit: searchParams.get('dlqLimit') || searchParams.get('limit'),
            queueLimit: searchParams.get('queueLimit') || searchParams.get('limit'),
            deliveryLimit: searchParams.get('deliveryLimit') || searchParams.get('limit'),
            alertLimit: searchParams.get('alertLimit') || searchParams.get('limit'),
            errorLimit: searchParams.get('errorLimit') || searchParams.get('limit'),
        });

        return NextResponse.json(snapshot);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}, ['super_admin']);

export const POST = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const result = await performShosAction(body, user);
        return NextResponse.json(result, { status: result.success === false ? 400 : 200 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}, ['super_admin']);