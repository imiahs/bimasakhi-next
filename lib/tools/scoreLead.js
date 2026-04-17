/**
 * TOOL: score_lead — Heuristic lead scoring (0-100)
 * Wraps existing lib/ai/leadScorer.js
 */
import { registerTool } from './index';
import { calculateLeadScore } from '@/lib/ai/leadScorer';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

registerTool('score_lead', {
    timeout: 10000,
    retries: 1,
    costPerCall: 0, // No AI cost — pure heuristic
    version: '1.0.0',

    validateInput: (input) => {
        if (!input.leadId) return { valid: false, reason: 'leadId required' };
        return { valid: true };
    },

    validateOutput: (result) => {
        if (result === null || result === undefined) return { valid: false, reason: 'No score returned' };
        return { valid: true };
    },

    // DATA CONTRACT: After scoring, leads.lead_score must be non-null
    verifyDbState: async (input) => {
        const supabase = getServiceSupabase();
        const { data } = await supabase.from('leads').select('lead_score').eq('id', input.leadId).single();
        return {
            valid: data?.lead_score != null,
            actual: data?.lead_score,
            expected: 'non-null lead_score',
        };
    },

    execute: async (input) => {
        return await calculateLeadScore(input.leadId);
    },
});
