import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('failed_leads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            return NextResponse.json({
                success: true,
                data: { failed_leads: [] }
            });
        }

        return NextResponse.json({
            success: true,
            data: { failed_leads: data || [] }
        });

    } catch (error) {
        return NextResponse.json({
            success: true,
            data: { failed_leads: [] }
        });
    }
});
