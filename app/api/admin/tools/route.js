import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';

// GET: Fetch all tool configurations
export async function GET() {
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
}

// PUT: Update multiple tool configs at once
export async function PUT(request) {
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
}
