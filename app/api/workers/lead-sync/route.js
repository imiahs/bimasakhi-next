import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getZohoAccessToken, getZohoApiDomain } from '@/pages/api/_middleware/zoho.js';
import axios from 'axios';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

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
                status: 'contacted',
                updated_at: new Date()
            }).eq('id', leadId);

            // Emit success event for phase 2 telemetry/observability cleanly
            await supabase.from('lead_events').insert({
                lead_id: leadId,
                event_type: 'zoho_synced',
                metadata: { zoho_id: zohoId, action: result.action }
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
                metadata: { lead_id: leadId, retry_count: retryCount },
                created_at: new Date().toISOString()
            });
        } else {
            console.warn(`Lead sync transient failure (Retry ${retryCount}):`, errorMsg);
        }

        // Always throw 500 to trigger QStash backoff (or notify failure)
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}

export const POST = process.env.NODE_ENV === 'development' ? handler : verifySignatureAppRouter(handler);
