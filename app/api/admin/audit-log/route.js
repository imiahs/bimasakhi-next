import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/audit-log
 * Paginated audit log viewer. Super_admin only.
 * Query params: ?page=1&limit=50&action=create&email=admin@bimasakhi.com
 */
export const GET = withAdminAuth(async (request) => {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
        const actionFilter = searchParams.get('action');
        const emailFilter = searchParams.get('email');
        const offset = (page - 1) * limit;

        const supabase = getServiceSupabase();

        let query = supabase
            .from('admin_audit_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (actionFilter) {
            query = query.eq('action', actionFilter);
        }
        if (emailFilter) {
            query = query.eq('admin_email', emailFilter);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
