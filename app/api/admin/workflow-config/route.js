import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getAllWorkflowConfig, updateWorkflowValue } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/workflow-config
 * Returns all workflow configuration values.
 */
export const GET = withAdminAuth(async () => {
    try {
        const config = await getAllWorkflowConfig();
        return NextResponse.json({ success: true, data: config });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
});

/**
 * POST /api/admin/workflow-config
 * Update a workflow config value. Super_admin only.
 * Body: { key: string, value: number | string }
 */
export const POST = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const { key, value } = body;

        if (!key || value === undefined || value === null) {
            return NextResponse.json({ error: 'key and value required' }, { status: 400 });
        }

        const result = await updateWorkflowValue(key, value, user.email || user.id);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
