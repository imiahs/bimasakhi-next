import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('failed_leads')
            .delete()
            .not('id', 'is', null)
            .select('id');

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            deleted: (data || []).length,
            message: 'Failed leads cleared.'
        });
    } catch (error) {
        console.error('Clear failed-leads API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to clear failed leads'
        }, { status: 500 });
    }
});
