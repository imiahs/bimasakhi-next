import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getZohoAccessToken, getZohoApiDomain } from '@/pages/api/_middleware/zoho.js';
import axios from 'axios';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { handleLeadCreated } from '@/lib/executives/cmo';
import { handleEvent } from '@/lib/events/bus';
import { transitionLead, LeadStates } from '@/lib/state/leadState';
import { markCompleted, markFailed } from '@/lib/events/eventStore';
import { verifyConsistency } from '@/lib/system/transaction';

async function loadLeadForSync(supabase, leadId) {
    const fieldsWithRefId = 'sync_status, zoho_lead_id, full_name, mobile, email, city, state, pincode, locality, occupation, education, source, medium, campaign, ref_id';
    const fieldsWithoutRefId = 'sync_status, zoho_lead_id, full_name, mobile, email, city, state, pincode, locality, occupation, education, source, medium, campaign';

    const result = await supabase
        .from('leads')
        .update({ sync_status: 'processing' })
        .eq('id', leadId)
        .neq('sync_status', 'completed')
        .select(fieldsWithRefId)
        .single();

    if (!result.error || !result.error.message?.includes('ref_id')) {
        return result;
    }

    console.warn('[Lead Sync] ref_id column unavailable; retrying without it');

    return supabase
        .from('leads')
        .update({ sync_status: 'processing' })
        .eq('id', leadId)
        .neq('sync_status', 'completed')
        .select(fieldsWithoutRefId)
        .single();
}

async function handler(req) {
    const body = await req.json();
    const { leadId } = body;
    if (!leadId) return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });

    console.log('WORKER HIT', leadId);

    const supabase = getServiceSupabase();
    const executionContext = body._execution_context || {};
    const eventStoreId = body._event_store_id || null;
    const correlationId = executionContext.correlation_id || null;

    // --- CMO EXECUTIVE: Score + Route (MANDATORY — single authority for scoring/routing) ---
    try {
        const cmoResult = await handleLeadCreated(leadId, executionContext);
        console.log('[CMO]', JSON.stringify({ leadId, hot: cmoResult.hot_lead, steps: cmoResult.steps.length }));

        // If CMO found a hot lead, emit lead_hot event for CSO
        if (cmoResult.hot_lead) {
            handleEvent('lead_hot', { leadId, session_id: body.session_id }, 'executive_cmo')
                .then(r => console.log('[CMO → CSO] lead_hot dispatched:', r.success))
                .catch(e => console.warn('[CMO → CSO] lead_hot failed:', e.message));
        }
    } catch (cmoErr) {
        // CMO failure = log + stop (Rule 6). Non-blocking for Zoho sync.
        console.error('[CMO] Executive failed:', cmoErr.message);
        try { await supabase.from('observability_logs').insert({
            level: 'EXECUTIVE_FAILED',
            message: `CMO failed for lead ${leadId}: ${cmoErr.message}`,
            source: 'worker_lead_sync',
            metadata: { lead_id: leadId, error: cmoErr.message, event_id: executionContext.event_id, correlation_id: correlationId },
        }); } catch (_) {}
    }

    // Atomic Status Transition & Idempotency Check (Worker Optimization)
    const { data: checkData, error: updateErr } = await loadLeadForSync(supabase, leadId);

    if (updateErr || !checkData) {
        // If it fails, we assume it's already completed or not found
        return NextResponse.json({ success: true, note: 'Already completed, missing or safely skipping duplicate' });
    }

    try {
        const accessToken = await getZohoAccessToken();
        const ZOHO_API_DOMAIN = getZohoApiDomain();
        const crmUrl = `${ZOHO_API_DOMAIN}/crm/v2.1/Leads/upsert`;

        const leadData = {
            Last_Name: checkData.full_name,
            Mobile: checkData.mobile,
            Email: checkData.email,
            City: checkData.city,
            State: checkData.state,
            Zip_Code: checkData.pincode,
            Street: checkData.locality,
            Designation: checkData.occupation,
            Description: `Education: ${checkData.education}\nUTM Source: ${checkData.source}\nUTM Medium: ${checkData.medium}\nUTM Campaign: ${checkData.campaign}`,
            Lead_Source: 'Website'
        };

        // Worker Timeout: 10s max (Guardrail 2)
        const crmResponse = await axios.post(crmUrl, {
            data: [leadData],
            duplicate_check_fields: ['Mobile'],
            trigger: ['approval', 'workflow', 'blueprint']
        }, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 
        });

        const result = crmResponse.data?.data?.[0];

        if (result && (result.status === 'success' || result.status === 'duplicate')) {
            const zohoId = result.details.id;

            await supabase.from('leads').update({
                zoho_lead_id: zohoId,
                sync_status: 'completed',
                updated_at: new Date()
            }).eq('id', leadId);

            // State machine: transition to 'contacted' via validated path
            const transition = await transitionLead(leadId, LeadStates.CONTACTED, {
                trigger: 'zoho_sync',
                zoho_id: zohoId,
            });
            if (!transition.success) {
                console.warn(`[StateMachine] Lead ${leadId} transition failed: ${transition.error}`);
            }

            // Emit success event for phase 2 telemetry/observability cleanly
            await supabase.from('lead_events').insert({
                lead_id: leadId,
                event_type: 'zoho_synced',
                metadata: { zoho_id: zohoId, action: result.action }
            });

            // POST-EXECUTION CONSISTENCY CHECK (Rule 4)
            const consistency = await verifyConsistency([
                {
                    name: 'sync_status_completed',
                    check: async () => {
                        const { data } = await supabase.from('leads').select('sync_status').eq('id', leadId).single();
                        return { valid: data?.sync_status === 'completed', actual: data?.sync_status, expected: 'completed' };
                    },
                },
                {
                    name: 'zoho_id_set',
                    check: async () => {
                        const { data } = await supabase.from('leads').select('zoho_lead_id').eq('id', leadId).single();
                        return { valid: !!data?.zoho_lead_id, actual: data?.zoho_lead_id, expected: 'non-null zoho_lead_id' };
                    },
                },
            ]);

            if (!consistency.consistent) {
                console.error(`[LeadSync] Post-execution consistency FAILED for lead ${leadId}:`, JSON.stringify(consistency.checks));
                try { await supabase.from('observability_logs').insert({
                    level: 'CONSISTENCY_VIOLATION',
                    message: `Lead ${leadId} post-sync consistency check failed`,
                    source: 'worker_lead_sync',
                    metadata: { lead_id: leadId, checks: consistency.checks, correlation_id: correlationId },
                }); } catch (_) {}
            }

            // COMPLETION ACK — mark event_store as completed (Rule 2)
            await markCompleted(eventStoreId, {
                zoho_id: zohoId,
                sync_action: result.action,
                lead_id: leadId,
                correlation_id: correlationId,
                consistency: consistency.consistent,
            });

            return NextResponse.json({ success: true, zohoId });
        } else {
            throw new Error('CRM Details: ' + JSON.stringify(crmResponse.data));
        }

    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        
        // QStash Retry Fix: Only mark failed after final retry attempt
        const retryCount = parseInt(req.headers.get('upstash-retried')) || 0;
        const isFinalRetry = retryCount >= 2;

        if (isFinalRetry) {
            await supabase.from('leads').update({
                sync_status: 'failed'
            }).eq('id', leadId);

            await supabase.from('observability_logs').insert({
                level: 'ERROR',
                message: `Lead sync failed permanently after retries: ${errorMsg}`,
                source: 'worker_lead_sync',
                metadata: { lead_id: leadId, retry_count: retryCount, correlation_id: correlationId },
                created_at: new Date().toISOString()
            });

            // FAILURE ACK — mark event_store as failed (Rule 2)
            await markFailed(eventStoreId, errorMsg, { lead_id: leadId, retry_count: retryCount });
        } else {
            console.warn(`Lead sync transient failure (Retry ${retryCount}):`, errorMsg);
        }

        // Always throw 500 to trigger QStash backoff (or notify failure)
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}

export const POST = process.env.NODE_ENV === 'development' ? handler : verifySignatureAppRouter(handler);
