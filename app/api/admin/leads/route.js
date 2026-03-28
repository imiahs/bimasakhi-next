import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('lead_queue')
            .select('id, name, mobile, city, source, created_at, synced_to_zoho')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Leads DB error:', error);
            return NextResponse.json({ leads: [] }, { status: 200 });
        }

        const leads = (data || []).map((lead) => ({
            id: lead.id,

            // NEW STRUCTURE
            name: lead.name || 'Unknown',
            mobile: lead.mobile || '',
            city: lead.city || '',
            source: lead.source || 'Direct',

            // BACKWARD COMPATIBILITY (CRITICAL)
            Last_Name: lead.name || 'Unknown',
            Mobile: lead.mobile || '',
            City: lead.city || '',
            Lead_Source: lead.source || 'Direct',

            created_at: lead.created_at,
            synced_to_zoho: !!lead.synced_to_zoho,
            status: lead.synced_to_zoho ? 'converted' : 'new'
        }));

        return NextResponse.json({ leads });

    } catch (error) {
        console.error('Leads API crash:', error);
        return NextResponse.json({ leads: [] }, { status: 200 });
    }
});
