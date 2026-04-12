import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request, user) => {
    try {
        const { lead_id, conversion_value } = await request.json();

        if (!lead_id) {
            return NextResponse.json({ success: false, error: 'lead_id is required' }, { status: 400 });
        }

        const parsedValue = Math.max(0, Number(conversion_value || 0));
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('leads')
            .update({
                is_converted: true,
                converted_at: new Date().toISOString(),
                conversion_value: parsedValue,
                conversion_source: 'admin_manual',
                status: 'converted'
            })
            .eq('id', lead_id)
            .select('id, is_converted, conversion_value, converted_at, conversion_source')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: 'Lead marked as converted.',
            lead: data
        });
    } catch (error) {
        console.error('Lead conversion API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to update lead conversion'
        }, { status: 500 });
    }
});
