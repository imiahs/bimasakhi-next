import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getCodeVisibilitySnapshot } from '@/lib/system/codeVisibility';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request) => {
    try {
        const url = new URL(request.url);
        const moduleId = url.searchParams.get('module');
        const snapshot = await getCodeVisibilitySnapshot(moduleId);

        if (!snapshot.success) {
            return NextResponse.json(snapshot, { status: 400 });
        }

        return NextResponse.json(snapshot);
    } catch (error) {
        console.error('[Admin System Code] GET error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}, ['super_admin']);