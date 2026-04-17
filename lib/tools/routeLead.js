/**
 * TOOL: route_lead — Heuristic agent assignment
 * Wraps existing lib/ai/leadRouter.js
 */
import { registerTool } from './index';
import { routeLeadToAgent } from '@/lib/ai/leadRouter';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

registerTool('route_lead', {
    timeout: 10000,
    retries: 1,
    costPerCall: 0,
    version: '1.0.0',

    validateInput: (input) => {
        if (!input.leadId) return { valid: false, reason: 'leadId required' };
        return { valid: true };
    },

    validateOutput: (result) => {
        if (result === null || result === undefined) return { valid: false, reason: 'No routing result' };
        return { valid: true };
    },

    // DATA CONTRACT: After routing, leads.agent_id must be non-null
    verifyDbState: async (input, result) => {
        // If router intentionally skipped (e.g., no agents available), that's valid
        if (result?.skipped || result?.reason) {
            return { valid: true, actual: 'skipped', expected: 'skipped_or_assigned' };
        }
        const supabase = getServiceSupabase();
        const { data } = await supabase.from('leads').select('agent_id').eq('id', input.leadId).single();
        return {
            valid: data?.agent_id != null,
            actual: data?.agent_id,
            expected: 'non-null agent_id',
        };
    },

    execute: async (input) => {
        return await routeLeadToAgent(input.leadId);
    },
});
