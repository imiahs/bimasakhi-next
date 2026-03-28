import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
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

        const normalizePayload = (payload, fallback) => {
            if (!payload) return fallback;
            if (typeof payload === 'string') {
                try {
                    return JSON.parse(payload);
                } catch {
                    return fallback;
                }
            }
            return payload;
        };

        const failedLeads = (data || []).map((row) => ({
            ...row,
            payload: normalizePayload(row.payload, {
                name: row.name,
                mobile: row.mobile,
                city: row.city
            }),
            error_message: row.error_message || row.error || 'Unknown error',
            retry_count: row.retry_count || 0
        }));

        if (error) {
            return NextResponse.json({
                success: true,
                failed_leads: [],
                data: { failed_leads: [] }
            });
        }

        return NextResponse.json({
            success: true,
            failed_leads: failedLeads,
            data: { failed_leads: failedLeads }
        });

    } catch (error) {
        return NextResponse.json({
            success: true,
            failed_leads: [],
            data: { failed_leads: [] }
        });
    }
});
