import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getAllFeatureFlags, updateFeatureFlag } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/feature-flags
 * Returns all feature flags grouped by category.
 */
export const GET = withAdminAuth(async () => {
    try {
        const flags = await getAllFeatureFlags();
        return NextResponse.json({ success: true, data: flags });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
});

/**
 * POST /api/admin/feature-flags
 * Toggle a feature flag. Restricted flags require super_admin role.
 * Body: { key: string, value: boolean }
 */
export const POST = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const { key, value } = body;

        if (!key || typeof value !== 'boolean') {
            return NextResponse.json({ error: 'key (string) and value (boolean) required' }, { status: 400 });
        }

        // Check if flag is restricted (super_admin only)
        const flags = await getAllFeatureFlags();
        const flag = flags.find(f => f.key === key);
        if (!flag) {
            return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 });
        }

        if (flag.restricted && user.role !== 'super_admin') {
            return NextResponse.json({ error: 'This flag requires super_admin role' }, { status: 403 });
        }

        const result = await updateFeatureFlag(key, value, user.email || user.id);
        if (!result) {
            return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: result });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin', 'editor']);

/**
 * PUT /api/admin/feature-flags
 * Fix 6a: Create a new feature flag. Super_admin only.
 * Body: { key, label, description, category, value, restricted }
 */
export const PUT = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const { key, label, description, category, value, restricted } = body;

        if (!key || !label) {
            return NextResponse.json({ error: 'key and label are required' }, { status: 400 });
        }

        if (!/^[a-z0-9_]+$/.test(key)) {
            return NextResponse.json({ error: 'key must be lowercase alphanumeric with underscores only' }, { status: 400 });
        }

        const validCategories = ['generation', 'publishing', 'leads', 'automation', 'system'];
        if (category && !validCategories.includes(category)) {
            return NextResponse.json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }, { status: 400 });
        }

        const { getServiceSupabase } = await import('@/utils/supabaseClientSingleton');
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('feature_flags')
            .insert({
                key,
                label,
                description: description || '',
                category: category || 'system',
                value: Boolean(value),
                restricted: Boolean(restricted),
                last_changed_by: user.email || user.id,
                last_changed_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: `Flag with key "${key}" already exists` }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
