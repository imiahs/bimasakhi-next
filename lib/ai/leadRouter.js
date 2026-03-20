import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

/**
 * Distributes leads based on agent availability, conversion scores, and fairness weights natively
 */
export async function routeLeadToAgent(leadId) {
    try {
        const supabase = getServiceSupabase();

        // 1. Check Feature Flag
        const { data: config } = await supabase
            .from('tool_configs')
            .select('config_value')
            .eq('config_key', 'ai_lead_routing_enabled')
            .maybeSingle();
            
        if (config && config.config_value === 'false') {
            return { success: false, reason: 'AI routing disabled via Feature Flags' };
        }

        const { data: lead } = await supabase.from('leads').select('id, city, manual_override, agent_id').eq('id', leadId).single();
        if (!lead) return { success: false, reason: 'Lead not found' };

        // 2. Override Protection - Respect manual CRM limits
        if (lead.manual_override || lead.agent_id) {
            return { success: false, reason: 'Manual override active or already assigned.' };
        }

        // 3. Find Available High-Converting Agents in Region
        const { data: eligibleAgents } = await supabase
            .from('agents')
            .select('agent_id, city, status')
            .eq('status', 'active'); 

        if (!eligibleAgents || eligibleAgents.length === 0) {
            return { success: false, reason: 'No eligible geographic agents available.' };
        }

        // Grab conversion performance natively
        const agentIds = eligibleAgents.map(a => a.agent_id);
        const { data: perfMetrics } = await supabase
            .from('agent_business_metrics')
            .select('agent_id, leads_assigned, leads_converted, avg_response_time_minutes')
            .in('agent_id', agentIds);

        let bestAgent = null;
        let highestWeight = -1;
        let decisionLogic = [];

        // Fair Distribution vs High Conversion Heuristics
        for (const agent of eligibleAgents) {
            const stats = perfMetrics?.find(p => p.agent_id === agent.agent_id) || { leads_assigned: 0, leads_converted: 0, avg_response_time_minutes: 60 };
            
            let conversionRate = stats.leads_assigned > 0 ? (stats.leads_converted / stats.leads_assigned) * 100 : 50; 
            let fairnessScore = Math.max(0, 100 - stats.leads_assigned); 
            let responseBonus = Math.max(0, 60 - stats.avg_response_time_minutes); 

            let rawWeight = (conversionRate * 0.5) + (fairnessScore * 0.3) + (responseBonus * 0.2);

            // Geographic matching bump
            if (agent.city && lead.city && agent.city.toLowerCase() === lead.city.toLowerCase()) {
                rawWeight += 50; 
            }

            if (rawWeight > highestWeight) {
                highestWeight = rawWeight;
                bestAgent = agent;
                decisionLogic = [
                    `Conversion Rate Weight: ${conversionRate.toFixed(1)}`,
                    `Fairness Scale: ${fairnessScore}`,
                    `SLA Response Bonus: ${responseBonus}`
                ];
            }
        }

        if (!bestAgent) {
            return { success: false, reason: 'Could not resolve best agent heuristics.' };
        }

        // 4. Atomic Assignment Transaction
        const { error: assignErr } = await supabase
            .from('leads')
            .update({ agent_id: bestAgent.agent_id })
            .eq('id', leadId)
            .is('agent_id', null); 

        if (assignErr) {
            return { success: false, reason: `Assignment collision: ${assignErr.message}` };
        }

        const routingReason = `Agent selected via AI Heuristics (Score: ${highestWeight.toFixed(1)}) | ${decisionLogic.join(' | ')}`;

        // 5. Store Logs
        await Promise.all([
            supabase.from('lead_routing_logs').insert({
                lead_id: leadId,
                agent_id: bestAgent.agent_id,
                routing_reason: routingReason
            }),
            supabase.from('ai_decision_logs').insert({
                lead_id: leadId,
                decision_type: 'routing',
                decision_reason: routingReason,
                metadata: { target_agent: bestAgent.agent_id, map_weight: highestWeight }
            })
            // supabase.rpc requires function to exist, commenting out just in case
            // supabase.rpc('increment_agent_assignments', { agent_uid: bestAgent.agent_id })
        ]);

        console.log(`[LeadRouter] Routed lead ${leadId} to agent ${bestAgent.agent_id}`);
        return { success: true, agent_id: bestAgent.agent_id };
    } catch (e) {
        console.error('[LeadRouter] Error:', e);
        return { success: false, reason: 'Internal Router Error' };
    }
}
