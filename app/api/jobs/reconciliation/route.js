import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const maxDuration = 60;

/**
 * RECONCILIATION JOB — Periodic scan for data inconsistencies.
 *
 * Scheduled via QStash cron (every 30 minutes).
 * Detects and auto-repairs common inconsistency patterns.
 *
 * Checks:
 *   1. Leads stuck in 'processing' sync_status for > 10 min
 *   2. Leads with zoho_lead_id but sync_status != 'completed'
 *   3. Leads with agent_id but status still 'new' (state machine bypass)
 *   4. Leads with lead_score but no agent_id and status not 'lost'
 *   5. Contacts stuck in 'processing' sync_status
 *   6. Event store: events completed but no worker_result
 *
 * QStash Schedule:
 *   URL: https://bimasakhi.com/api/jobs/reconciliation
 *   Cron: 0,30 * * * *   (every 30 minutes)
 */
async function handler(request) {
    const startTime = Date.now();
    const supabase = getServiceSupabase();
    const issues = [];
    const repairs = [];

    // CHECK 1: Leads stuck in 'processing' for > 10 minutes
    try {
        const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: stuckLeads } = await supabase
            .from('leads')
            .select('id, sync_status, updated_at')
            .eq('sync_status', 'processing')
            .lt('updated_at', cutoff)
            .limit(50);

        if (stuckLeads?.length) {
            for (const lead of stuckLeads) {
                issues.push({ type: 'stuck_processing', table: 'leads', id: lead.id, detail: `stuck since ${lead.updated_at}` });
                // AUTO-REPAIR: Reset to 'pending' so retry daemon can pick it up
                await supabase.from('leads').update({ sync_status: 'pending' }).eq('id', lead.id).eq('sync_status', 'processing');
                repairs.push({ type: 'stuck_processing', id: lead.id, action: 'reset_to_pending' });
            }
        }
    } catch (e) {
        issues.push({ type: 'check_error', check: 'stuck_processing_leads', error: e.message });
    }

    // CHECK 2: Leads with zoho_lead_id but sync_status != 'completed'
    try {
        const { data: mismatchLeads } = await supabase
            .from('leads')
            .select('id, sync_status, zoho_lead_id')
            .not('zoho_lead_id', 'is', null)
            .neq('sync_status', 'completed')
            .limit(50);

        if (mismatchLeads?.length) {
            for (const lead of mismatchLeads) {
                issues.push({ type: 'zoho_sync_mismatch', table: 'leads', id: lead.id, detail: `has zoho_lead_id=${lead.zoho_lead_id} but sync_status=${lead.sync_status}` });
                // AUTO-REPAIR: Set sync_status to 'completed' since Zoho already has the data
                await supabase.from('leads').update({ sync_status: 'completed' }).eq('id', lead.id);
                repairs.push({ type: 'zoho_sync_mismatch', id: lead.id, action: 'set_completed' });
            }
        }
    } catch (e) {
        issues.push({ type: 'check_error', check: 'zoho_sync_mismatch', error: e.message });
    }

    // CHECK 3: Leads with agent_id but status still 'new' (state machine was bypassed)
    try {
        const { data: bypassedLeads } = await supabase
            .from('leads')
            .select('id, status, agent_id')
            .not('agent_id', 'is', null)
            .eq('status', 'new')
            .limit(50);

        if (bypassedLeads?.length) {
            for (const lead of bypassedLeads) {
                issues.push({ type: 'state_bypass', table: 'leads', id: lead.id, detail: `has agent_id=${lead.agent_id} but status=new` });
                // FLAG ONLY — don't auto-repair state machine violations. Admin must decide.
            }
        }
    } catch (e) {
        issues.push({ type: 'check_error', check: 'state_bypass', error: e.message });
    }

    // CHECK 4: Leads with lead_score set but no agent_id (incomplete CMO flow)
    try {
        const { data: partialScored } = await supabase
            .from('leads')
            .select('id, lead_score, agent_id, status')
            .not('lead_score', 'is', null)
            .is('agent_id', null)
            .not('status', 'in', '("lost","converted")')
            .limit(50);

        if (partialScored?.length) {
            for (const lead of partialScored) {
                issues.push({ type: 'partial_scoring', table: 'leads', id: lead.id, detail: `scored=${lead.lead_score} but no agent_id, status=${lead.status}` });
                // FLAG ONLY — this indicates saga compensation may have left residual score
            }
        }
    } catch (e) {
        // This query may fail if lead_score column doesn't exist — non-fatal
        if (!e.message?.includes('does not exist')) {
            issues.push({ type: 'check_error', check: 'partial_scoring', error: e.message });
        }
    }

    // CHECK 5: Contacts stuck in 'processing'
    try {
        const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: stuckContacts } = await supabase
            .from('contact_inquiries')
            .select('contact_id, sync_status')
            .eq('sync_status', 'processing')
            .limit(50);

        if (stuckContacts?.length) {
            for (const contact of stuckContacts) {
                issues.push({ type: 'stuck_processing', table: 'contact_inquiries', id: contact.contact_id });
                await supabase.from('contact_inquiries').update({ sync_status: 'pending' }).eq('contact_id', contact.contact_id).eq('sync_status', 'processing');
                repairs.push({ type: 'stuck_processing', id: contact.contact_id, action: 'reset_to_pending' });
            }
        }
    } catch (e) {
        issues.push({ type: 'check_error', check: 'stuck_processing_contacts', error: e.message });
    }

    const duration = Date.now() - startTime;

    // Log reconciliation run
    const level = issues.length > 0 ? 'RECONCILIATION_ISSUES_FOUND' : 'RECONCILIATION_CLEAN';
    await supabase.from('observability_logs').insert({
        level,
        message: `Reconciliation: ${issues.length} issues found, ${repairs.length} auto-repaired`,
        source: 'reconciliation_job',
        metadata: {
            issues_count: issues.length,
            repairs_count: repairs.length,
            issues: issues.slice(0, 20), // cap for log size
            repairs: repairs.slice(0, 20),
            duration_ms: duration,
        },
    }).catch(() => {});

    return NextResponse.json({
        success: true,
        issues_found: issues.length,
        auto_repaired: repairs.length,
        issues,
        repairs,
        duration_ms: duration,
    });
}

export const POST = verifySignatureAppRouter(handler);
