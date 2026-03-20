import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

/**
 * Calculates a lead score between 0 and 100 based on standard heuristics.
 */
export async function calculateLeadScore(leadId) {
    try {
        const supabase = getServiceSupabase();
        
        // Check Feature Flag
        const { data: config } = await supabase
            .from('tool_configs')
            .select('config_value')
            .eq('config_key', 'ai_lead_scoring_enabled')
            .maybeSingle();
            
        if (config && config.config_value === 'false') {
            return null; // Automation disabled
        }

        const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
        if (!lead) return null;

        let score = 50; // Base score
        let reasons = [];

        // Demographic analysis
        if (lead.age && lead.age >= 25 && lead.age <= 45) {
            score += 15;
            reasons.push('Prime demographic age');
        }

        // Explicit Interest
        if (lead.interest_level && lead.interest_level.toLowerCase() === 'high') {
            score += 20;
            reasons.push('High declared interest');
        }

        // Traffic Source Quality
        const highQualitySources = ['organic', 'referral', 'linkedin', 'direct'];
        if (lead.marketing_source && highQualitySources.includes(lead.marketing_source.toLowerCase())) {
            score += 10;
            reasons.push('High intent marketing source');
        }

        // Form Completion & Validation
        if (lead.mobile && lead.email) {
            score += 5;
            reasons.push('Complete contact parameters');
        }

        score = Math.min(Math.max(score, 0), 100);

        // Save and log atomic transaction asynchronously
        await Promise.all([
            supabase.from('leads').update({ lead_score: score }).eq('id', leadId),
            supabase.from('ai_decision_logs').insert({
                lead_id: leadId,
                decision_type: 'scoring',
                decision_reason: `Calculated score: ${score} - ${reasons.join(', ')}`,
                metadata: { base: 50, final: score }
            })
        ]);

        console.log(`[LeadScorer] Scored lead ${leadId} with ${score}`);
        return score;
    } catch (e) {
        console.error('[LeadScorer] Error:', e);
        return null;
    }
}
