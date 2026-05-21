import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'open';

        const [systemErrorsRes, runtimeErrorsRes] = await Promise.all([
            supabase
                .from('system_errors')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50),
            supabase
                .from('system_runtime_errors')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50),
        ]);

        if (systemErrorsRes.error) throw systemErrorsRes.error;
        if (runtimeErrorsRes.error) throw runtimeErrorsRes.error;

        const systemErrors = (systemErrorsRes.data || []).map((row) => ({
            ...row,
            source_type: 'system_errors',
            message: row.message,
        }));

        const runtimeErrors = (runtimeErrorsRes.data || []).map((row) => ({
            ...row,
            source_type: 'system_runtime_errors',
            message: row.error_message,
        }));

        const errors = [...systemErrors, ...runtimeErrors]
            .filter((row) => status === 'all' || row.resolved !== true)
            .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
            .slice(0, 50);

        return NextResponse.json({ success: true, errors });
    } catch (error) {
        console.error('API /admin/errors GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch system errors', details: error.message }, { status: 500 });
    }
});

export const POST = withAdminAuth(async (request, user) => {
    try {
        const payload = await request.json();
        const { layer, message, stack_trace, source, component, error_type } = payload;

        const supabase = getServiceSupabase();
        const { error } = await supabase.from('system_errors').insert({
            error_type: error_type || layer || 'UNKNOWN',
            component: component || source || 'SYSTEM',
            message: message || 'No message provided',
            stack_trace: stack_trace || '',
            resolved: false,
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
        const { id, resolved, source_type } = payload;

        if (!id) return NextResponse.json({ error: 'Missing error ID' }, { status: 400 });

        const supabase = getServiceSupabase();
        const tableName = source_type === 'system_runtime_errors' ? 'system_runtime_errors' : 'system_errors';
        const { error } = await supabase
            .from(tableName)
            .update({
                resolved: resolved ? true : false,
                resolved_at: resolved ? new Date().toISOString() : null,
                resolved_by: resolved ? (user?.email || user?.id || 'admin') : null,
            })
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update error status' }, { status: 500 });
    }
});
