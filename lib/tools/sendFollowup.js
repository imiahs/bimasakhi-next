/**
 * TOOL: send_followup — Dispatch follow-up messages
 * Wraps existing lib/followup/sendFollowupMessage.js
 */
import { registerTool } from './index';
import { sendFollowupMessage } from '@/lib/followup/sendFollowupMessage';

registerTool('send_followup', {
    timeout: 15000,
    retries: 2,
    costPerCall: 0,
    version: '1.0.0',

    validateInput: (input) => {
        if (!input.leadId) return { valid: false, reason: 'leadId required' };
        if (!input.message) return { valid: false, reason: 'message required' };
        return { valid: true };
    },

    validateOutput: (result) => {
        return { valid: true };
    },

    execute: async (input) => {
        return await sendFollowupMessage({
            leadId: input.leadId,
            message: input.message,
            channel: input.channel,
            recipient: input.recipient,
            metadata: input.metadata || {},
        });
    },
});
