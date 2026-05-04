import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

// GET: Fetch all tool configurations
export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('tool_configs')
            .select('*');

        if (error) throw error;

        // Convert array of {config_key: 'x', config_value: 'y'} into a single object mapping
        const configMap = {};
        if (data) {
            data.forEach(item => {
                configMap[item.config_key] = item.config_value;
            });
        }

        return NextResponse.json({ configs: configMap });
    } catch (error) {
        console.error('API /admin/tools GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch tool configs' }, { status: 500 });
    }
});

// PUT: Update multiple tool configs at once
export const PUT = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();

        const normalizedPayload = Object.fromEntries(
            Object.entries(payload || {}).map(([key, value]) => [key, value])
        );

        const updateKey = crypto
            .createHash('sha256')
            .update(JSON.stringify(normalizedPayload))
            .digest('hex');

        const { error } = await supabase.rpc('rule16_upsert_tool_configs', {
            p_configs: normalizedPayload,
            p_tool_name: 'calculator',
            p_idempotency_key: updateKey,
        });

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Configs updated!' });
    } catch (error) {
        console.error('API /admin/tools PUT error:', error);
        return NextResponse.json({ error: 'Failed to update tool configs' }, { status: 500 });
    }
});
