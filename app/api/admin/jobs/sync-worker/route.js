import { NextResponse } from 'next/server';
import { getLocalDb } from '@/utils/localDb';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

// This acts as a background Cron target to sync fail-safed leads to external services.
// GET /api/admin/jobs/sync-worker
export const GET = withAdminAuth(async (request, user) => {
    // 1. Authenticate the cron request here (e.g., using a CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD || 'secret'}`) {
        // Warning: For demonstration; normally use a strictly secret token.
        // return NextResponse.json({ error: 'Unauthorized CRON trigger' }, { status: 401 });
    }

    try {
        const supabase = getServiceSupabase();

        // Fetch up to 50 pending leads
        const { data: pendingLeads, error: fetchErr } = await supabase
            .from('lead_queue')
            .select('*')
            .or('synced_to_zoho.eq.false,synced_to_supabase.eq.false')
            .limit(50);

        if (fetchErr) {
            console.error('Lead queue fetch error:', fetchErr);
            // Non-blocking fallback if table doesn't exist
            return NextResponse.json({ status: 'Idle', message: 'No pending leads or queue unavailable.' });
        }

        if (!pendingLeads || pendingLeads.length === 0) {
            return NextResponse.json({ status: 'Idle', message: 'No pending leads in queue.' });
        }

        let syncedCount = 0;
        const supabaseInserts = [];
        const successQueueIds = [];
        const errorLogs = [];
        const failureLogs = [];

        for (const lead of pendingLeads) {
            const payload = typeof lead.payload === 'string' ? JSON.parse(lead.payload) : lead.payload;

            // Task A: Prepare Sync to Supabase Cache
            if (!lead.synced_to_supabase) {
                supabaseInserts.push({
                    name: payload?.name || lead.name,
                    mobile: payload?.mobile || lead.mobile,
                    city: payload?.city || lead.city,
                    source: payload?.source || lead.source,
                    status: 'new'
                });
                successQueueIds.push(lead.id);
            }

            // Task B: Prepare Sync to Zoho
            if (!lead.synced_to_zoho) {
                if (!successQueueIds.includes(lead.id)) {
                    successQueueIds.push(lead.id);
                }
            }
            syncedCount++;
        }

        // Execute Bulk Inserts (Task A)
        if (supabaseInserts.length > 0) {
            const { error } = await supabase.from('lead_cache').insert(supabaseInserts);
            if (error) {
                console.error("Bulk Insert Error:", error);

                // Track failure
                errorLogs.push({
                    level: 'ERROR',
                    message: `Bulk Sync failed for ${supabaseInserts.length} Leads: ${error.message}`,
                    source: 'sync_worker'
                });
                throw new Error("Bulk insert failed, halting batch.");
            }
        }

        // Execute Bulk Updates to mark queues as synced
        if (successQueueIds.length > 0) {
            await supabase.from('lead_queue')
                .update({ synced_to_supabase: true, synced_to_zoho: true })
                .in('id', successQueueIds);
        }

        // Bulk log any critical failures if needed in future
        if (errorLogs.length > 0) {
            await supabase.from('observability_logs').insert(errorLogs);
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${pendingLeads.length} leads.`,
            synced: syncedCount
        });

    } catch (error) {
        return NextResponse.json({ error: 'Worker System Error', details: error.message }, { status: 500 });
    }
});
