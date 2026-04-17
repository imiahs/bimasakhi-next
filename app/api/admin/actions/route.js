import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { handleEvent } from '@/lib/events/bus';
import { logSystemAction } from '@/lib/systemConfig';
import { getEventStoreStats, markDispatched, markFailed, incrementRetry, getEventTimeline, getStuckEvents } from '@/lib/events/eventStore';
import { getTrigger } from '@/lib/events/triggerMap';
import { executeRunbook, RUNBOOKS } from '@/lib/monitoring/runbooks';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/actions
 * List dead letters + failed jobs for admin visibility
 */
export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const url = new URL(request.url);
        const view = url.searchParams.get('view') || 'dead_letters';
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

        if (view === 'dead_letters') {
            const { data, error } = await supabase
                .from('job_dead_letters')
                .select('*')
                .order('failed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return NextResponse.json({ success: true, view, data: data || [], count: data?.length || 0 });
        }

        if (view === 'failed_jobs') {
            const { data, error } = await supabase
                .from('job_runs')
                .select('*')
                .eq('status', 'failed')
                .order('finished_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return NextResponse.json({ success: true, view, data: data || [], count: data?.length || 0 });
        }

        if (view === 'state_transitions') {
            const { data, error } = await supabase
                .from('observability_logs')
                .select('*')
                .in('level', ['STATE_TRANSITION', 'STATE_TRANSITION_FAILED'])
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return NextResponse.json({ success: true, view, data: data || [], count: data?.length || 0 });
        }

        if (view === 'event_store') {
            const { data, error } = await supabase
                .from('event_store')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return NextResponse.json({ success: true, view, data: data || [], count: data?.length || 0 });
        }

        if (view === 'event_store_failed') {
            const { data, error } = await supabase
                .from('event_store')
                .select('*')
                .in('status', ['pending', 'failed'])
                .order('priority', { ascending: true })
                .order('created_at', { ascending: true })
                .limit(limit);

            if (error) throw error;
            return NextResponse.json({ success: true, view, data: data || [], count: data?.length || 0 });
        }

        if (view === 'event_store_stats') {
            const stats = await getEventStoreStats();
            return NextResponse.json({ success: true, view, data: stats });
        }

        // Rule 5: Admin timeline view — full lead lifecycle trace
        if (view === 'timeline') {
            const leadId = url.searchParams.get('lead_id');
            const correlationId = url.searchParams.get('correlation_id');

            if (!leadId && !correlationId) {
                return NextResponse.json({ error: 'timeline view requires lead_id or correlation_id param' }, { status: 400 });
            }

            const timeline = await getEventTimeline(leadId, correlationId);
            return NextResponse.json({ success: true, view, lead_id: leadId, correlation_id: correlationId, events: timeline, count: timeline.length });
        }

        // Rule 7 (Session 3): Metrics — completion rate, avg exec time, stuck count
        if (view === 'metrics') {
            const stats = await getEventStoreStats();
            const stuck = await getStuckEvents(15, 100);

            return NextResponse.json({
                success: true,
                view,
                metrics: {
                    completion_rate_pct: stats.completion_rate || 0,
                    avg_execution_time_ms: stats.avg_execution_time_ms || 0,
                    stuck_events_count: stats.stuck_count || 0,
                    total_events: stats.total || 0,
                    by_status: stats.by_status || {},
                    by_priority: stats.by_priority || {},
                    critical_failed: stats.critical_failed || 0,
                },
                stuck_events: stuck.map(e => ({
                    id: e.id,
                    event_name: e.event_name,
                    priority: e.priority,
                    dispatched_at: e.dispatched_at,
                    minutes_stuck: Math.round((Date.now() - new Date(e.dispatched_at).getTime()) / 60000),
                    correlation_id: e.correlation_id,
                })),
            });
        }

        // SESSION 4 Rule 7: Consistency view — on-demand scan for inconsistent records
        if (view === 'consistency') {
            const issues = [];

            // Check 1: Leads stuck in processing
            const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { data: stuckLeads } = await supabase
                .from('leads')
                .select('id, sync_status, updated_at')
                .eq('sync_status', 'processing')
                .lt('updated_at', cutoff)
                .limit(50);
            if (stuckLeads?.length) {
                stuckLeads.forEach(l => issues.push({ type: 'stuck_processing', table: 'leads', id: l.id, detail: `since ${l.updated_at}`, repair: 'Reset sync_status to pending' }));
            }

            // Check 2: Zoho ID without completed sync
            const { data: mismatchLeads } = await supabase
                .from('leads')
                .select('id, sync_status, zoho_lead_id')
                .not('zoho_lead_id', 'is', null)
                .neq('sync_status', 'completed')
                .limit(50);
            if (mismatchLeads?.length) {
                mismatchLeads.forEach(l => issues.push({ type: 'zoho_sync_mismatch', table: 'leads', id: l.id, detail: `zoho_lead_id=${l.zoho_lead_id} but sync_status=${l.sync_status}`, repair: 'Set sync_status to completed' }));
            }

            // Check 3: Agent assigned but status=new
            const { data: bypassedLeads } = await supabase
                .from('leads')
                .select('id, status, agent_id')
                .not('agent_id', 'is', null)
                .eq('status', 'new')
                .limit(50);
            if (bypassedLeads?.length) {
                bypassedLeads.forEach(l => issues.push({ type: 'state_bypass', table: 'leads', id: l.id, detail: `agent_id=${l.agent_id} but status=new`, repair: 'Manual: verify and advance state' }));
            }

            // Check 4: Recent consistency violations in logs
            const { data: violations } = await supabase
                .from('observability_logs')
                .select('id, level, message, metadata, created_at')
                .in('level', ['CONSISTENCY_VIOLATION', 'DB_CONTRACT_VIOLATION', 'RECONCILIATION_ISSUES_FOUND'])
                .order('created_at', { ascending: false })
                .limit(20);

            return NextResponse.json({
                success: true,
                view,
                summary: {
                    total_issues: issues.length,
                    recent_violations: violations?.length || 0,
                    status: issues.length === 0 ? 'CONSISTENT' : 'INCONSISTENCIES_FOUND',
                },
                issues,
                recent_violations: violations || [],
            });
        }

        return NextResponse.json({ error: 'Invalid view. Use: dead_letters, failed_jobs, state_transitions, event_store, event_store_failed, event_store_stats, timeline, metrics, consistency' }, { status: 400 });
    } catch (err) {
        console.error('[Admin Actions] GET error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
});

/**
 * POST /api/admin/actions
 * Admin control actions: retry, cancel, re-trigger event
 * 
 * Payload:
 * { action: 'retry_dead_letter', dead_letter_id: '...' }
 * { action: 'retrigger_event', event_name: 'lead_created', payload: {...} }
 * { action: 'cancel_job', job_run_id: '...' }
 * { action: 'purge_dead_letters', older_than_days: 7 }
 */
export const POST = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const { action } = body;
        const supabase = getServiceSupabase();
        const adminId = request.headers.get('x-admin-user') || request.headers.get('x-admin-id') || 'unknown';

        if (!action) {
            return NextResponse.json({ error: 'Missing action field' }, { status: 400 });
        }

        // --- RETRY DEAD LETTER ---
        if (action === 'retry_dead_letter') {
            const { dead_letter_id } = body;
            if (!dead_letter_id) {
                return NextResponse.json({ error: 'Missing dead_letter_id' }, { status: 400 });
            }

            const { data: dl, error } = await supabase
                .from('job_dead_letters')
                .select('*')
                .eq('id', dead_letter_id)
                .single();

            if (error || !dl) {
                return NextResponse.json({ error: 'Dead letter not found' }, { status: 404 });
            }

            // Extract event info from dead letter
            const jobClass = dl.job_class || '';
            let eventResult = null;

            if (jobClass.startsWith('event:')) {
                // Re-dispatch via event bus
                const eventName = jobClass.replace('event:', '');
                const payload = dl.payload || {};
                eventResult = await handleEvent(eventName, payload, 'admin_retry');
            } else if (jobClass.startsWith('tool:')) {
                // Tool failures need to go through the parent event
                eventResult = { success: false, reason: 'tool_retry_not_supported', message: 'Retry the parent event instead' };
            } else {
                eventResult = { success: false, reason: 'unknown_job_class' };
            }

            // Mark dead letter as retried
            await supabase.from('job_dead_letters').update({
                metadata: {
                    ...dl.metadata,
                    retried_at: new Date().toISOString(),
                    retried_by: adminId,
                    retry_result: eventResult,
                },
            }).eq('id', dead_letter_id);

            await logSystemAction('ADMIN_RETRY_DEAD_LETTER', {
                dead_letter_id,
                job_class: jobClass,
                result: eventResult,
                admin_id: adminId,
            }, adminId);

            return NextResponse.json({ success: true, action: 'retry_dead_letter', result: eventResult });
        }

        // --- RE-TRIGGER EVENT ---
        if (action === 'retrigger_event') {
            const { event_name, payload } = body;
            if (!event_name) {
                return NextResponse.json({ error: 'Missing event_name' }, { status: 400 });
            }

            const eventResult = await handleEvent(event_name, payload || {}, 'admin_retrigger');

            await logSystemAction('ADMIN_RETRIGGER_EVENT', {
                event_name,
                payload,
                result: eventResult,
                admin_id: adminId,
            }, adminId);

            return NextResponse.json({ success: true, action: 'retrigger_event', result: eventResult });
        }

        // --- CANCEL JOB ---
        if (action === 'cancel_job') {
            const { job_run_id } = body;
            if (!job_run_id) {
                return NextResponse.json({ error: 'Missing job_run_id' }, { status: 400 });
            }

            const { error } = await supabase
                .from('job_runs')
                .update({
                    status: 'cancelled',
                    error: 'Cancelled by admin',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', job_run_id)
                .in('status', ['pending', 'processing']);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            await logSystemAction('ADMIN_CANCEL_JOB', {
                job_run_id,
                admin_id: adminId,
            }, adminId);

            return NextResponse.json({ success: true, action: 'cancel_job', job_run_id });
        }

        // --- PURGE OLD DEAD LETTERS ---
        if (action === 'purge_dead_letters') {
            const days = parseInt(body.older_than_days || '7', 10);
            if (isNaN(days) || days < 1) {
                return NextResponse.json({ error: 'older_than_days must be >= 1' }, { status: 400 });
            }

            const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            const { error, count } = await supabase
                .from('job_dead_letters')
                .delete()
                .lt('failed_at', cutoff);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            await logSystemAction('ADMIN_PURGE_DEAD_LETTERS', {
                older_than_days: days,
                cutoff,
                deleted_count: count,
                admin_id: adminId,
            }, adminId);

            return NextResponse.json({ success: true, action: 'purge_dead_letters', deleted: count || 0 });
        }

        // --- RETRY EVENT FROM EVENT_STORE ---
        if (action === 'retry_event_store') {
            const { event_store_id } = body;
            if (!event_store_id) {
                return NextResponse.json({ error: 'Missing event_store_id' }, { status: 400 });
            }

            const { data: evt, error } = await supabase
                .from('event_store')
                .select('*')
                .eq('id', event_store_id)
                .single();

            if (error || !evt) {
                return NextResponse.json({ error: 'Event not found in event_store' }, { status: 404 });
            }

            // Look up trigger for re-dispatch
            const trigger = getTrigger(evt.event_name);
            if (!trigger || trigger.action !== 'queue_job' || !trigger.endpoint) {
                return NextResponse.json({ error: `No dispatchable trigger for event: ${evt.event_name}` }, { status: 400 });
            }

            try {
                await incrementRetry(event_store_id);

                const { Client } = await import('@upstash/qstash');
                const client = new Client({ token: process.env.QSTASH_TOKEN });
                const baseUrl = process.env.NODE_ENV === 'production'
                    ? 'https://bimasakhi.com'
                    : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

                const result = await client.publishJSON({
                    url: `${baseUrl}${trigger.endpoint}`,
                    body: {
                        ...evt.payload,
                        _execution_context: evt.execution_context,
                        _event_name: evt.event_name,
                        _executive: trigger.executive,
                        _event_store_id: event_store_id,
                        _admin_retry: true,
                    },
                });

                await markDispatched(event_store_id, result.messageId);

                await logSystemAction('ADMIN_RETRY_EVENT_STORE', {
                    event_store_id,
                    event_name: evt.event_name,
                    message_id: result.messageId,
                    admin_id: adminId,
                }, adminId);

                return NextResponse.json({ success: true, action: 'retry_event_store', message_id: result.messageId });
            } catch (dispatchErr) {
                await markFailed(event_store_id, dispatchErr.message);
                return NextResponse.json({ error: `Retry dispatch failed: ${dispatchErr.message}` }, { status: 500 });
            }
        }

        // --- FORCE DISPATCH (bypass policy, bypass mode) ---
        if (action === 'force_dispatch') {
            const { event_name, payload: eventPayload } = body;
            if (!event_name) {
                return NextResponse.json({ error: 'Missing event_name' }, { status: 400 });
            }

            const trigger = getTrigger(event_name);
            if (!trigger || trigger.action !== 'queue_job' || !trigger.endpoint) {
                return NextResponse.json({ error: `No dispatchable trigger for: ${event_name}` }, { status: 400 });
            }

            try {
                const { Client } = await import('@upstash/qstash');
                const client = new Client({ token: process.env.QSTASH_TOKEN });
                const baseUrl = process.env.NODE_ENV === 'production'
                    ? 'https://bimasakhi.com'
                    : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

                const result = await client.publishJSON({
                    url: `${baseUrl}${trigger.endpoint}`,
                    body: {
                        ...(eventPayload || {}),
                        _event_name: event_name,
                        _executive: trigger.executive,
                        _force_dispatch: true,
                    },
                });

                await logSystemAction('ADMIN_FORCE_DISPATCH', {
                    event_name,
                    payload: eventPayload,
                    message_id: result.messageId,
                    admin_id: adminId,
                }, adminId);

                return NextResponse.json({ success: true, action: 'force_dispatch', message_id: result.messageId });
            } catch (dispatchErr) {
                return NextResponse.json({ error: `Force dispatch failed: ${dispatchErr.message}` }, { status: 500 });
            }
        }

        // --- RUN RUNBOOK ---
        if (action === 'run_runbook') {
            const { runbook_id } = body;
            if (!runbook_id) {
                return NextResponse.json({ error: `Missing runbook_id. Available: ${Object.keys(RUNBOOKS).join(', ')}` }, { status: 400 });
            }
            await logSystemAction('run_runbook', { runbook_id }, adminId);
            const result = await executeRunbook(runbook_id);
            return NextResponse.json({ success: result.success, action: 'run_runbook', ...result });
        }

        // --- RESOLVE ALERT ---
        if (action === 'resolve_alert') {
            const { alert_id } = body;
            if (!alert_id) {
                return NextResponse.json({ error: 'Missing alert_id' }, { status: 400 });
            }
            const { error } = await supabase.from('system_alerts').update({ resolved: true }).eq('id', alert_id);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            await logSystemAction('resolve_alert', { alert_id }, adminId);
            return NextResponse.json({ success: true, action: 'resolve_alert', alert_id });
        }

        return NextResponse.json({ error: `Unknown action: ${action}. Valid: retry_dead_letter, retrigger_event, cancel_job, purge_dead_letters, retry_event_store, force_dispatch, run_runbook, resolve_alert` }, { status: 400 });
    } catch (err) {
        console.error('[Admin Actions] POST error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
});
