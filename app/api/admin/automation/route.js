import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('automation_rules')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ rules: data });
    } catch (error) {
        console.error('API /admin/automation GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch automation rules' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();

        // payload expects: { name, description, trigger_event, conditions: [...], actions: [...] }
        const { error, data } = await supabase
            .from('automation_rules')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, rule: data });
    } catch (error) {
        console.error('API /admin/automation POST error:', error);
        return NextResponse.json({ error: 'Failed to create automation rule' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();
        const { id, is_active } = payload;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const { error, data } = await supabase
            .from('automation_rules')
            .update({ is_active, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, rule: data });
    } catch (error) {
        console.error('API /admin/automation PUT error:', error);
        return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
    }
}
