import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Leads DB error:', error);
            return NextResponse.json({ leads: [] }, { status: 200 });
        }

        const leads = (data || []).map((lead) => {
            const name = lead.full_name || lead.name || 'Unknown';
            const source = lead.source || lead.Lead_Source || 'Website';
            const leadScore = Number(lead.lead_score || 0);
            const isConverted = Boolean(
                lead.is_converted === true ||
                lead.status === 'converted' ||
                lead.converted_at ||
                Number(lead.conversion_value || 0) > 0
            );
            const conversionValue = Number(lead.conversion_value || 0);
            const zohoSynced = Boolean(lead.zoho_lead_id);
            const status = lead.status || (isConverted ? 'converted' : (zohoSynced ? 'contacted' : 'new'));

            return {
                id: lead.id,
                ref_id: lead.ref_id || lead.id,
                name,
                full_name: name,
                mobile: lead.mobile || '',
                email: lead.email || '',
                city: lead.city || '',
                source,
                status,
                lead_score: leadScore,
                score: leadScore,
                is_converted: isConverted,
                conversion_value: conversionValue,
                converted_at: lead.converted_at || null,
                synced_to_zoho: zohoSynced,
                zoho_lead_id: lead.zoho_lead_id || null,
                followup_status: lead.followup_status || null,
                created_at: lead.created_at,
                Created_Time: lead.created_at,
                Last_Name: name,
                Mobile: lead.mobile || '',
                City: lead.city || '',
                Lead_Source: source,
                Lead_Status: isConverted ? 'Converted' : status
            };
        });

        return NextResponse.json({ leads });

    } catch (error) {
        console.error('Leads API crash:', error);
        return NextResponse.json({ leads: [] }, { status: 200 });
    }
});
