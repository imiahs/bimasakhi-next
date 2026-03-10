import { NextResponse } from 'next/server';
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

        // Expect payload to be an object: { firstYearCommission: 25, renewalCommission: 5, ... }
        const promises = Object.entries(payload).map(async ([key, value]) => {
            // First try to check if it exists
            const { data: existing } = await supabase
                .from('tool_configs')
                .select('id')
                .eq('config_key', key)
                .single();

            if (existing) {
                // Phase 18: Data Versioning Hook (Snapshot before update)
                const { data: currentTool, error: fetchErr } = await supabase
                    .from('tool_configs')
                    .select('*')
                    .eq('id', existing.id)
                    .single();

                if (!fetchErr && currentTool) {
                    await supabase.from('tool_config_versions').insert({
                        config_id: currentTool.id,
                        tool_name: currentTool.tool_name,
                        config_key: currentTool.config_key,
                        config_value: currentTool.config_value
                    });
                }

                // Update
                return supabase
                    .from('tool_configs')
                    .update({ config_value: String(value) })
                    .eq('id', existing.id);
            } else {
                // Insert (Tool name can be generically 'global' or 'calculator' for now)
                return supabase
                    .from('tool_configs')
                    .insert({
                        tool_name: 'calculator',
                        config_key: key,
                        config_value: String(value)
                    });
            }
        });

        await Promise.all(promises);

        return NextResponse.json({ success: true, message: 'Configs updated!' });
    } catch (error) {
        console.error('API /admin/tools PUT error:', error);
        return NextResponse.json({ error: 'Failed to update tool configs' }, { status: 500 });
    }
});
