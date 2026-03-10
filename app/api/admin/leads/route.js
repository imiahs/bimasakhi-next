import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        // Fetch leads from Supabase (SQLite removed — incompatible with Vercel)
        const { data, error } = await supabase
            .from('lead_cache')
            .select('*')
            .order('created_at', { ascending: false });

        let leads = [];
        if (!error && data) {
            leads = data.map(lead => ({
                id: lead.id,
                name: lead.name,
                mobile: lead.mobile,
                city: lead.city,
                source: lead.source,
                status: lead.status || 'new',
                created_at: lead.created_at,
                storage: 'Supabase'
            }));
        } else if (error) {
            console.error('Supabase fetch error for leads:', error);
        }

        return NextResponse.json({ leads });
    } catch (error) {
        console.error('API /admin/leads GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch leads from sources' }, { status: 500 });
    }
});
