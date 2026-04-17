/**
 * CIRCUIT BREAKER — If a tool fails repeatedly, auto-disable it.
 * Tracks failure counts in memory (resets on cold start — acceptable for serverless).
 * For persistent state, checks tool_configs.enabled flag.
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// In-memory failure tracker (per-instance, resets on cold start)
const breakers = new Map();

function getBreaker(toolName) {
    if (!breakers.has(toolName)) {
        breakers.set(toolName, { failures: 0, state: 'closed', lastFailure: 0 });
    }
    return breakers.get(toolName);
}

export function isCircuitOpen(toolName) {
    const breaker = getBreaker(toolName);

    if (breaker.state === 'open') {
        // Check if reset timeout has elapsed → move to half-open
        if (Date.now() - breaker.lastFailure > RESET_TIMEOUT_MS) {
            breaker.state = 'half-open';
            return false; // Allow one attempt
        }
        return true; // Still open
    }
    return false;
}

export function recordSuccess(toolName) {
    const breaker = getBreaker(toolName);
    breaker.failures = 0;
    breaker.state = 'closed';
}

export async function recordFailure(toolName) {
    const breaker = getBreaker(toolName);
    breaker.failures += 1;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= FAILURE_THRESHOLD) {
        breaker.state = 'open';

        // Persist: disable tool in DB
        try {
            const supabase = getServiceSupabase();
            await supabase.from('tool_configs')
                .update({ enabled: false })
                .eq('tool_name', toolName);

            await supabase.from('observability_logs').insert({
                level: 'CIRCUIT_BREAKER_OPEN',
                message: `Tool ${toolName} disabled after ${FAILURE_THRESHOLD} consecutive failures`,
                source: 'circuit_breaker',
                metadata: { tool: toolName, failures: breaker.failures },
            });
        } catch (e) {
            console.error('[CircuitBreaker] Failed to persist state:', e.message);
        }
    }
}

export function getBreakerState(toolName) {
    const breaker = getBreaker(toolName);
    return { ...breaker };
}
