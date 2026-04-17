/**
 * CSO EXECUTIVE — Handles lead conversion & follow-up.
 * 
 * Events: lead_hot
 * Flow: send follow-up message via tool system
 * 
 * NO fancy logic. Just connects existing tools.
 */
import '@/lib/tools/sendFollowup';
import { executeTool } from '@/lib/tools/index';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export async function handleLeadHot(leadId, executionContext = {}) {
    const startTime = Date.now();
    const supabase = getServiceSupabase();
    const results = { executive: 'cso', event: 'lead_hot', leadId, steps: [] };

    // Step 1: Fetch lead for follow-up
    const { data: lead } = await supabase
        .from('leads')
        .select('full_name, mobile, email, agent_id, followup_status')
        .eq('id', leadId)
        .single();

    if (!lead) {
        results.error = 'Lead not found';
        return results;
    }

    if (lead.followup_status === 'completed') {
        results.skipped = 'followup_already_completed';
        return results;
    }

    // Step 2: Get template
    const { data: templates } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('is_active', true)
        .limit(1);

    if (!templates?.length) {
        results.error = 'No active templates';
        return results;
    }

    const template = templates[0];

    // Step 3: Resolve agent name
    let agentName = 'Our Bima Sakhi Expert';
    if (lead.agent_id) {
        const { data: agent } = await supabase.from('agents').select('name').eq('agent_id', lead.agent_id).single();
        if (agent) agentName = agent.name;
    }

    // Step 4: Build message
    const message = template.content
        .replace(/\{\{lead_name\}\}/g, lead.full_name)
        .replace(/\{\{agent_name\}\}/g, agentName);

    const recipient = lead.mobile || lead.email;
    if (!recipient) {
        results.error = 'No recipient';
        return results;
    }

    // Step 5: Send via tool system
    const sendResult = await executeTool('send_followup', {
        leadId,
        message,
        channel: template.template_type || (lead.mobile ? 'whatsapp' : 'email'),
        recipient,
        metadata: { template_id: template.id, agent_id: lead.agent_id },
    }, executionContext);

    results.steps.push({ tool: 'send_followup', success: sendResult.success, duration_ms: sendResult.duration_ms });
    results.duration_ms = Date.now() - startTime;

    // Log executive action
    try { await supabase.from('observability_logs').insert({
        level: sendResult.success ? 'EXECUTIVE_COMPLETE' : 'EXECUTIVE_FAILED',
        message: `CSO: lead ${leadId} follow-up ${sendResult.success ? 'sent' : 'failed'}`,
        source: 'executive_cso',
        metadata: {
            ...results,
            event_id: executionContext.event_id,
            correlation_id: executionContext.correlation_id,
        },
    }); } catch (_) {}

    return results;
}
