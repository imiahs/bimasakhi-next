/**
 * POLICY ENGINE — shouldExecute(event, context)
 * Controls: feature flags, rate limits, cost limits, system mode.
 * No execution without policy approval.
 */
import { getSystemConfig } from '@/lib/systemConfig';

const DAILY_AI_COST_LIMIT_USD = 5.0;
const MAX_RETRIES = { tool: 2, executive: 1, queue: 3 };

export async function shouldExecute(event, context) {
    const config = await getSystemConfig();
    const reasons = [];

    // 1. System mode check
    if (config.queue_paused && event.requires_queue !== false) {
        reasons.push('queue_paused');
    }

    // 2. Feature flag checks
    if (event.requires_ai && !config.ai_enabled) {
        reasons.push('ai_disabled');
    }
    if (event.requires_followup && !config.followup_enabled) {
        reasons.push('followup_disabled');
    }

    // 3. Retry limit check
    const layer = event.layer || 'queue';
    const maxRetry = MAX_RETRIES[layer] || 3;
    if (context.retries > maxRetry) {
        reasons.push(`max_retries_exceeded:${layer}(${context.retries}/${maxRetry})`);
    }

    // 4. Cost limit check
    if (context.cost && context.cost.estimated_usd > DAILY_AI_COST_LIMIT_USD) {
        reasons.push(`cost_limit_exceeded:$${context.cost.estimated_usd}`);
    }

    return {
        allowed: reasons.length === 0,
        reasons,
        config,
    };
}

export function getMaxRetries(layer) {
    return MAX_RETRIES[layer] || 3;
}
