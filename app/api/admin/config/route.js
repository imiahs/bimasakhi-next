import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/config
 * Returns the singleton system_control_config row
 * Protected by middleware JWT (existing)
 */
export async function GET() {
    try {
        const config = await getSystemConfig();
        return NextResponse.json({ success: true, data: config });
    } catch (err) {
        console.error('[Config API] GET failed:', err.message);
        return NextResponse.json({ success: false, error: 'Failed to load config' }, { status: 500 });
    }
}

/**
 * POST /api/admin/config
 * Atomic UPSERT of system_control_config
 * Logs every change to system_logs
 * Protected by middleware JWT (existing)
 * 
 * Payload: { ai_enabled?, queue_paused?, batch_size?, crm_auto_routing?, followup_enabled? }
 */
export async function POST(request) {
    try {
        const body = await request.json();

        // Whitelist allowed fields only — reject anything else
        const allowedKeys = ['ai_enabled', 'queue_paused', 'batch_size', 'crm_auto_routing', 'followup_enabled'];
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
        const adminId = request.headers.get('x-admin-id') || 'unknown';
        await logSystemAction('CONFIG_UPDATED', {
            changes: updatePayload,
            admin_id: adminId,
        }, adminId);

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[Config API] POST error:', err.message);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
