import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getSystemMode, setSystemMode, getModeDescription } from '@/lib/system/systemModes';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/config
 *
 * Admin-only runtime control endpoint.
 * This is the operational source of truth for system flags.
 *
 * It is intentionally separate from /api/config, which is public marketing/app config.
 */
export const GET = withAdminAuth(async (request, user) => {
    try {
        const config = await getSystemConfig();
        const mode = await getSystemMode();
        return NextResponse.json({
            success: true,
            data: {
                ...config,
                system_mode: mode,
                system_mode_description: getModeDescription(mode),
            },
        });
    } catch (err) {
        console.error('[Config API] GET failed:', err.message);
        return NextResponse.json({ success: false, error: 'Failed to load config' }, { status: 500 });
    }
});

/**
 * POST /api/admin/config
 *
 * Admin-only runtime control mutation.
 * Only operational flags may be changed here.
 *
 * Payload:
 * { ai_enabled?, queue_paused?, batch_size?, crm_auto_routing?, followup_enabled? }
 *
 * Boolean flags express switch state only.
 * Effective system state still depends on prerequisites outside this table
 * such as schema readiness, provider credentials, and worker health.
 */
export const POST = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();

        // Whitelist allowed fields only — reject anything else
        const allowedKeys = ['ai_enabled', 'queue_paused', 'batch_size', 'crm_auto_routing', 'followup_enabled', 'system_mode'];
        const updatePayload = {};

        for (const key of allowedKeys) {
            if (body[key] !== undefined) {
                // Type validation
                if (key === 'batch_size') {
                    const val = parseInt(body[key], 10);
                    if (isNaN(val) || val < 1 || val > 50) {
                        return NextResponse.json({ error: `batch_size must be 1-50` }, { status: 400 });
                    }
                    updatePayload[key] = val;
                } else if (key === 'system_mode') {
                    const validModes = ['normal', 'degraded', 'emergency'];
                    if (!validModes.includes(body[key])) {
                        return NextResponse.json({ error: `system_mode must be one of: ${validModes.join(', ')}` }, { status: 400 });
                    }
                    updatePayload[key] = body[key];
                } else {
                    updatePayload[key] = Boolean(body[key]);
                }
            }
        }

        if (Object.keys(updatePayload).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
        }

        updatePayload.updated_at = new Date().toISOString();

        const supabase = getServiceSupabase();

        // Atomic UPSERT — singleton row guaranteed
        const { data, error } = await supabase
            .from('system_control_config')
            .upsert(
                { singleton_key: true, ...updatePayload },
                { onConflict: 'singleton_key' }
            )
            .select()
            .single();

        if (error) {
            console.error('[Config API] UPSERT failed:', error.message);
            return NextResponse.json({ success: false, error: 'Config update failed' }, { status: 500 });
        }

        // Audit log — every config change MUST be logged
        const adminId = request.headers.get('x-admin-user') || request.headers.get('x-admin-id') || 'unknown';
        await logSystemAction('CONFIG_UPDATED', {
            changes: updatePayload,
            admin_id: adminId,
        }, adminId);

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[Config API] POST error:', err.message);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
});
