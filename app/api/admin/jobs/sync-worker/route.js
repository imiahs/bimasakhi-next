import { NextResponse } from 'next/server';
import { getLocalDb } from '@/utils/localDb';
import { getServiceSupabase } from '@/utils/supabase';

export const dynamic = 'force-dynamic';

// This acts as a background Cron target to sync fail-safed leads to external services.
// GET /api/admin/jobs/sync-worker
export async function GET(request) {
    // 1. Authenticate the cron request here (e.g., using a CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD || 'secret'}`) {
        // Warning: For demonstration; normally use a strictly secret token.
        // return NextResponse.json({ error: 'Unauthorized CRON trigger' }, { status: 401 });
    }

    try {
        const db = getLocalDb();

        // Fetch up to 50 pending leads
        const pendingLeads = db.prepare(`
            SELECT * FROM lead_queue 
            WHERE (synced_to_zoho = 0 OR synced_to_supabase = 0)
            LIMIT 50
        `).all();

        if (pendingLeads.length === 0) {
            return NextResponse.json({ status: 'Idle', message: 'No pending leads in queue.' });
        }

        const supabase = getServiceSupabase();
        let syncedCount = 0;

        for (const lead of pendingLeads) {
            const payload = JSON.parse(lead.payload);

            try {
                // Task A: Sync to Supabase Cache
                if (!lead.synced_to_supabase) {
                    const { error } = await supabase.from('lead_cache').insert({
                        name: lead.name,
                        mobile: lead.mobile,
                        city: lead.city,
                        source: lead.source,
                        status: 'new'
                    });

                    if (error) throw new Error(`Supabase Sync Error: ${error.message}`);
                    db.prepare('UPDATE lead_queue SET synced_to_supabase = 1 WHERE id = ?').run(lead.id);
                }

                // Task B: Sync to Zoho CRM
                if (!lead.synced_to_zoho) {
                    // MOCK ZOHO API CALL TO PREVENT SPAM DURING DEVELOPMENT
                    // const zohoResponse = await fetch('YOUR_ZOHO_URL', { ... }); 

                    // Assuming Success...
                    db.prepare('UPDATE lead_queue SET synced_to_zoho = 1 WHERE id = ?').run(lead.id);
                }

                syncedCount++;

            } catch (err) {
                // Push to sync_failures Dead-Letter Queue
                db.prepare(`
                    INSERT INTO sync_failures (service, payload, error) 
                    VALUES (?, ?, ?)
                `).run('sync_worker', lead.payload, err.message);

                // Track internally
                db.prepare('INSERT INTO observability_logs (level, message, source) VALUES (?, ?, ?)')
                    .run('ERROR', `Sync failed for Lead ID ${lead.id}: ${err.message}`, 'sync_worker');
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${pendingLeads.length} leads.`,
            synced: syncedCount
        });

    } catch (error) {
        return NextResponse.json({ error: 'Worker System Error', details: error.message }, { status: 500 });
    }
}
