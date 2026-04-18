/**
 * GET /api/admin/dlq — List dead letter queue entries
 * POST /api/admin/dlq — Reprocess or discard a DLQ entry
 * 
 * Bible Reference: Section 39, Rule 21
 * Super admin only.
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

async function handler(req) {
    const supabase = getServiceSupabase();

    if (req.method === 'GET') {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'all';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('job_dead_letters')
            .select('*, job_runs!job_dead_letters_job_run_id_fkey(task_type, status)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Note: job_dead_letters doesn't have a status column — all are "pending" by default
        // We use the presence/absence of resolution columns if they exist

        const { data, error, count } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            data: data || [],
            total: count || 0,
            page,
            pages: Math.ceil((count || 0) / limit),
        });
    }

    if (req.method === 'POST') {
        const body = await req.json();
        const { id, action } = body;

        if (!id || !action) {
            return NextResponse.json({ error: 'id and action required' }, { status: 400 });
        }

        if (!['reprocess', 'discard'].includes(action)) {
            return NextResponse.json({ error: 'action must be reprocess or discard' }, { status: 400 });
        }

        // Get the DLQ entry
        const { data: entry, error: fetchErr } = await supabase
            .from('job_dead_letters')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !entry) {
            return NextResponse.json({ error: 'DLQ entry not found' }, { status: 404 });
        }

        if (action === 'discard') {
            // Delete the entry (it's been reviewed and discarded)
            await supabase.from('job_dead_letters').delete().eq('id', id);

            // Audit log
            await supabase.from('observability_logs').insert({
                level: 'DLQ_DISCARDED',
                message: `DLQ entry ${id} discarded by admin`,
                source: 'dlq_consumer',
                metadata: { dlq_id: id, job_class: entry.job_class, admin: req.adminUser?.email },
            });

            return NextResponse.json({ success: true, action: 'discarded' });
        }

        if (action === 'reprocess') {
            // Re-queue the job based on job_class
            try {
                // Create a new job_run entry from the dead letter
                const { data: newRun, error: insertErr } = await supabase
                    .from('job_runs')
                    .insert({
                        task_type: entry.job_class,
                        status: 'pending',
                        payload: entry.payload,
                        source: 'dlq_reprocess',
                    })
                    .select('id')
                    .single();

                if (insertErr) {
                    return NextResponse.json({ error: 'Failed to create reprocess job: ' + insertErr.message }, { status: 500 });
                }

                // Remove from DLQ
                await supabase.from('job_dead_letters').delete().eq('id', id);

                // Audit log
                await supabase.from('observability_logs').insert({
                    level: 'DLQ_REPROCESSED',
                    message: `DLQ entry ${id} reprocessed → new job_run ${newRun.id}`,
                    source: 'dlq_consumer',
                    metadata: { dlq_id: id, new_job_id: newRun.id, job_class: entry.job_class, admin: req.adminUser?.email },
                });

                return NextResponse.json({ success: true, action: 'reprocessed', newJobId: newRun.id });
            } catch (err) {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export const GET = withAdminAuth(handler, ['super_admin']);
export const POST = withAdminAuth(handler, ['super_admin']);
