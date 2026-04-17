import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getZohoAccessToken, getZohoApiDomain } from '@/pages/api/_middleware/zoho.js';
import axios from 'axios';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { markCompleted, markFailed } from '@/lib/events/eventStore';
import { verifyConsistency } from '@/lib/system/transaction';

async function handler(req) {
    const body = await req.json();
    const { contactId } = body;
    if (!contactId) return NextResponse.json({ error: 'Missing contactId' }, { status: 400 });

    const supabase = getServiceSupabase();
    const executionContext = body._execution_context || {};
    const eventStoreId = body._event_store_id || null;
    const correlationId = executionContext.correlation_id || null;

    // Atomic Status Transition & Idempotency Check (Worker Optimization)
    const { data: checkData, error: updateErr } = await supabase
        .from('contact_inquiries')
        .update({ sync_status: 'processing' })
        .eq('contact_id', contactId)
        .neq('sync_status', 'completed')
        .select('sync_status, name, mobile, email, message, reason, source, pipeline, tag')
        .single();

    if (updateErr || !checkData) {
        // If it fails, we assume it's already completed or not found
        return NextResponse.json({ success: true, note: 'Already completed, missing or safely skipping duplicate' });
    }

    try {
        const accessToken = await getZohoAccessToken();
        const apiDomain = getZohoApiDomain();
        const crmUrl = `${apiDomain}/crm/v2/Leads`;

        const contactPayload = {
            Last_Name: checkData.name,
            Mobile: checkData.mobile,
            Email: checkData.email,
            Description: `Reason: ${checkData.reason}\nMessage: ${checkData.message}\nPipeline: ${checkData.pipeline || 'General'}\nTag: ${checkData.tag || 'None'}`,
            Lead_Source: checkData.source || 'Website Contact Form'
        };

        const crmResponse = await axios.post(crmUrl, {
            data: [contactPayload],
            trigger: ['approval', 'workflow', 'blueprint']
        }, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // Worker Timeout 10s
        });

        const result = crmResponse.data?.data?.[0];

        if (result && (result.status === 'success' || result.status === 'duplicate')) {
            const zohoId = result.details.id;
            await supabase.from('contact_inquiries').update({
                sync_status: 'completed'
            }).eq('contact_id', contactId);

            // Emit success event for phase 2 telemetry/observability securely
            await supabase.from('contact_events').insert({
                contact_id: contactId,
                event_type: 'zoho_synced',
                metadata: { zoho_id: zohoId, action: result.action }
            });

            // POST-EXECUTION CONSISTENCY CHECK (Rule 4)
            const consistency = await verifyConsistency([
                {
                    name: 'sync_status_completed',
                    check: async () => {
                        const { data } = await supabase.from('contact_inquiries').select('sync_status').eq('contact_id', contactId).single();
                        return { valid: data?.sync_status === 'completed', actual: data?.sync_status, expected: 'completed' };
                    },
                },
            ]);

            if (!consistency.consistent) {
                console.error(`[ContactSync] Post-execution consistency FAILED for contact ${contactId}`);
                await supabase.from('observability_logs').insert({
                    level: 'CONSISTENCY_VIOLATION',
                    message: `Contact ${contactId} post-sync consistency check failed`,
                    source: 'worker_contact_sync',
                    metadata: { contact_id: contactId, checks: consistency.checks, correlation_id: correlationId },
                }).catch(() => {});
            }

            // COMPLETION ACK — mark event_store as completed (Rule 2)
            await markCompleted(eventStoreId, {
                zoho_id: zohoId,
                sync_action: result.action,
                contact_id: contactId,
                correlation_id: correlationId,
                consistency: consistency.consistent,
            });

            return NextResponse.json({ success: true, zohoId });
        } else {
            throw new Error('CRM Contact Details: ' + JSON.stringify(crmResponse.data));
        }

    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        
        // QStash Retry Fix: Only mark failed after final retry attempt
        const retryCount = parseInt(req.headers.get('upstash-retried')) || 0;
        const isFinalRetry = retryCount >= 2;

        if (isFinalRetry) {
            await supabase.from('contact_inquiries').update({
                sync_status: 'failed'
            }).eq('contact_id', contactId);

            await supabase.from('observability_logs').insert({
                level: 'ERROR',
                message: `Contact sync failed permanently after retries: ${errorMsg}`,
                source: 'worker_contact_sync',
                metadata: { contact_id: contactId, retry_count: retryCount, correlation_id: correlationId },
                created_at: new Date().toISOString()
            });

            // FAILURE ACK — mark event_store as failed (Rule 2)
            await markFailed(eventStoreId, errorMsg, { contact_id: contactId, retry_count: retryCount });
        } else {
            console.warn(`Contact sync transient failure (Retry ${retryCount}):`, errorMsg);
        }

        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}

export const POST = process.env.NODE_ENV === 'development' ? handler : verifySignatureAppRouter(handler);
