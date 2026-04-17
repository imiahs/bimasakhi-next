/**
 * EXECUTION CONTEXT — Every flow carries this.
 * No execution without context. No context without trace.
 */
import crypto from 'crypto';

export function createExecutionContext(event, source = 'unknown') {
    return {
        event_id: event.event_id || crypto.randomUUID(),
        correlation_id: event.correlation_id || crypto.randomUUID(),
        source,
        timestamp: new Date().toISOString(),
        retries: event.retries || 0,
        cost: { ai_calls: 0, ai_tokens: 0, estimated_usd: 0 },
    };
}

export function withRetry(ctx) {
    return {
        ...ctx,
        retries: ctx.retries + 1,
        timestamp: new Date().toISOString(),
    };
}
