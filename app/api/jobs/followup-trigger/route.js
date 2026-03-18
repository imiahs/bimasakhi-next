import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

export const maxDuration = 300;

async function handler(request) {
    const startTime = Date.now();
    const upstashMessageId = request.headers.get('upstash-message-id') || `manual-${Date.now()}`;
    
    let body = {};
    try { body = await request.json(); } catch { body = {}; }
    
    const { leadId } = body;
    if (!leadId) {
        return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    let successStatus = false;
    let errorMessage = null;
    let auditLog = null;

    try {
        // 1. Fetch Lead and Template
        const { data: lead } = await supabase.from('leads').select('full_name, mobile, email, followup_status, agent_id').eq('id', leadId).single();
        if (!lead) throw new Error('Lead not found');

        if (lead.followup_status === 'completed') {
            auditLog = 'Follow-up already completed. Skipping.';
            successStatus = true;
            return NextResponse.json({ success: true, message: auditLog });
        }

        // 2. Cooldown Protection
        const { data: recentLogs } = await supabase
            .from('ai_decision_logs')
            .select('created_at')
            .eq('lead_id', leadId)
            .eq('decision_type', 'followup')
            .order('created_at', { ascending: false })
            .limit(1);

        if (recentLogs?.length > 0) {
            const lastSent = new Date(recentLogs[0].created_at).getTime();
            const now = Date.now();
            if (now - lastSent < 24 * 60 * 60 * 1000) { // 24h cooldown
                auditLog = 'Cooldown active (last sent within 24h). Skipping.';
                successStatus = true;
                return NextResponse.json({ success: true, message: auditLog });
            }
        }

        // 3. Fetch Template
        const { data: templates } = await supabase
            .from('communication_templates')
            .select('*')
            .eq('is_active', true)
            .limit(1);

        if (!templates?.length) throw new Error('No active communication templates found');
        const template = templates[0];

        // 4. Fetch Agent Name (for template variables)
        let agentName = 'Our Bima Sakhi Expert';
        if (lead.agent_id) {
            const { data: agent } = await supabase.from('agents').select('name').eq('agent_id', lead.agent_id).single();
            if (agent) agentName = agent.name;
        }

        // 5. Replace Template Variables
        const message = template.content
            .replace(/\{\{lead_name\}\}/g, lead.full_name)
            .replace(/\{\{agent_name\}\}/g, agentName);

        // 6. "Send" Message (Mocking API call to WhatsApp/Email provider)
        console.info(`[Follow-up] Sending ${template.template_type} to ${lead.mobile || lead.email}: ${message}`);
        
        // 7. Log Decision
        await supabase.from('ai_decision_logs').insert({
            lead_id: leadId,
            decision_type: 'followup',
            decision_reason: `Sent ${template.template_name} (${template.template_type})`,
            metadata: { template_id: template.id, type: template.template_type, message_preview: message.substring(0, 100) }
        });

        // 8. Update Lead Status
        await supabase.from('leads').update({ followup_status: 'completed' }).eq('id', leadId);

        successStatus = true;
        auditLog = `Successfully triggered ${template.template_type} follow-up.`;
    } catch (e) {
        errorMessage = e;
        console.error('[Follow-up Trigger Worker]', e);
    } finally {
        const executionTime = Date.now() - startTime;
        await supabase.from('worker_health').insert({
            worker_name: 'followup-trigger',
            status: successStatus ? 'healthy' : 'error',
            last_run: new Date().toISOString(),
            message: successStatus ? auditLog : (errorMessage instanceof Error ? errorMessage.message : errorMessage),
            metrics: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                success: successStatus,
                lead_id: leadId,
                error_stack: !successStatus ? (errorMessage instanceof Error ? errorMessage.stack : errorMessage) : null
            }
        });
    }

    if (!successStatus) return NextResponse.json({ error: errorMessage instanceof Error ? errorMessage.message : errorMessage }, { status: 500 });
    return NextResponse.json({ success: true, message: auditLog });
}

export const POST = verifySignatureAppRouter(handler);
