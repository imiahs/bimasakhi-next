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

/**
 * PUT /api/admin/workflow-config
 * Create a new workflow config key. Super_admin only.
 * Body: { key, label, description, category, value_type, value }
 */
export const PUT = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const { key, label, description, category, value_type, value, min_value, max_value } = body;
        if (!key || !label) {
            return NextResponse.json({ error: 'key and label are required' }, { status: 400 });
        }
        if (!/^[a-z0-9_]+$/.test(key)) {
            return NextResponse.json({ error: 'key must be lowercase alphanumeric with underscores' }, { status: 400 });
        }
        const validCategories = ['quality', 'publishing', 'generation', 'leads', 'ai', 'cost'];
        if (category && !validCategories.includes(category)) {
            return NextResponse.json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }, { status: 400 });
        }
        const type = value_type === 'text' ? 'text' : 'number';
        const entry = {
            key, label,
            description: description || '',
            category: category || 'system',
            value_type: type,
            value_number: type === 'number' ? Number(value) || 0 : null,
            value_text: type === 'text' ? String(value || '') : null,
            min_value: min_value != null ? Number(min_value) : null,
            max_value: max_value != null ? Number(max_value) : null,
            last_changed_by: user.email || user.id,
        };
        const { getServiceSupabase } = await import('@/utils/supabaseClientSingleton');
        const supabase = getServiceSupabase();
        const { data, error } = await supabase.from('workflow_config').insert(entry).select().single();
        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: `Config key "${key}" already exists` }, { status: 409 });
            }
            throw error;
        }
        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
