import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        // Fetch system errors from Supabase (replaces SQLite)
        const { data: errors, error } = await supabase
            .from('system_errors')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        return NextResponse.json({ success: true, errors: errors || [] });
    } catch (error) {
        console.error('API /admin/errors GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch system errors', details: error.message }, { status: 500 });
    }
});

export const POST = withAdminAuth(async (request, user) => {
    try {
        const payload = await request.json();
        const { layer, message, stack_trace, source } = payload;

        const supabase = getServiceSupabase();
        const { error } = await supabase.from('system_errors').insert({
            layer: layer || 'UNKNOWN',
            message: message || 'No message provided',
            stack_trace: stack_trace || '',
            source: source || 'SYSTEM'
        });

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
    }
});

export const PUT = withAdminAuth(async (request, user) => {
    try {
        const payload = await request.json();
        const { id, resolved } = payload;

        if (!id) return NextResponse.json({ error: 'Missing error ID' }, { status: 400 });

        const supabase = getServiceSupabase();
        const { error } = await supabase
            .from('system_errors')
            .update({ resolved: resolved ? true : false })
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update error status' }, { status: 500 });
    }
});
