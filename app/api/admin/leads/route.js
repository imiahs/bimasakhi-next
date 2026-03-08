import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { getLocalDb } from '@/utils/localDb';

export const runtime = 'nodejs'; // Node runtime required for better-sqlite3
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = getServiceSupabase();

        // 1. Fetch Primary Leads from Supabase lead_cache
        let supabaseLeads = [];
        const { data, error } = await supabase
            .from('lead_cache')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            supabaseLeads = data.map(lead => ({
                id: lead.id,
                name: lead.name,
                mobile: lead.mobile,
                city: lead.city,
                source: lead.source,
                status: lead.status || 'new',
                created_at: lead.created_at,
                storage: 'Supabase'
            }));
        } else {
            console.error('Supabase fetch error for leads:', error);
        }

        // 2. Fetch Offline/Pending Leads from local SQLite lead_queue
        let localLeads = [];
        try {
            const db = getLocalDb();
            const queueRows = db.prepare(`SELECT * FROM lead_queue WHERE synced_to_supabase = 0`).all();

            localLeads = queueRows.map(row => ({
                id: row.id,
                name: row.name,
                mobile: row.mobile,
                city: row.city,
                source: row.source,
                status: 'pending_sync',
                created_at: row.created_at,
                storage: 'Local SQLite Queue'
            }));
        } catch (sqliteError) {
            console.error('Local SQLite fetch error for leads:', sqliteError);
        }

        // 3. Merge and sort by created_at descending
        const mergedLeads = [...localLeads, ...supabaseLeads];
        mergedLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return NextResponse.json({ leads: mergedLeads });
    } catch (error) {
        console.error('API /admin/leads GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch leads from sources' }, { status: 500 });
    }
}
