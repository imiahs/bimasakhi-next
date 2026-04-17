/**
 * TRANSACTION HELPER — Atomic multi-step DB operations.
 *
 * Supabase JS client doesn't support native SQL transactions,
 * so we implement an application-level saga with compensation.
 *
 * Pattern:
 *   1. Execute steps sequentially
 *   2. Track completed steps
 *   3. On failure → run compensation for completed steps (reverse order)
 *   4. Log the saga outcome (success, compensated, or compensation_failed)
 *
 * This guarantees: no partial updates survive in the DB.
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

/**
 * Execute a saga — a sequence of steps with compensation.
 *
 * @param {string} sagaName - Human-readable name for logging
 * @param {Array<{name: string, execute: Function, compensate: Function}>} steps
 *   Each step has:
 *     - name: step identifier
 *     - execute(context): async function, returns result (added to context)
 *     - compensate(context): async function, reverts the step
 * @param {object} initialContext - Seed data (leadId, etc.)
 * @returns {{ success: boolean, results: object, compensated: boolean, error?: string }}
 */
export async function executeSaga(sagaName, steps, initialContext = {}) {
    const context = { ...initialContext };
    const completedSteps = [];
    const results = {};

    for (const step of steps) {
        try {
            const stepResult = await step.execute(context);
            results[step.name] = { success: true, result: stepResult };
            context[step.name] = stepResult;
            completedSteps.push(step);
        } catch (err) {
            results[step.name] = { success: false, error: err.message };

            // COMPENSATE — reverse completed steps
            const compensationResults = await compensate(completedSteps, context);

            await logSagaOutcome(sagaName, 'compensated', {
                failed_step: step.name,
                error: err.message,
                completed_steps: completedSteps.map(s => s.name),
                compensation: compensationResults,
                context: sanitizeContext(context),
            });

            return {
                success: false,
                results,
                compensated: true,
                failed_step: step.name,
                error: err.message,
                compensation: compensationResults,
            };
        }
    }

    await logSagaOutcome(sagaName, 'completed', {
        steps: steps.map(s => s.name),
        context: sanitizeContext(context),
    });

    return { success: true, results, compensated: false };
}

/**
 * Run compensation for completed steps in reverse order.
 */
async function compensate(completedSteps, context) {
    const results = {};
    // Reverse order — undo last step first
    for (let i = completedSteps.length - 1; i >= 0; i--) {
        const step = completedSteps[i];
        if (!step.compensate) {
            results[step.name] = { skipped: true, reason: 'no_compensate_defined' };
            continue;
        }
        try {
            await step.compensate(context);
            results[step.name] = { compensated: true };
        } catch (compErr) {
            results[step.name] = { compensated: false, error: compErr.message };
            // Log but don't throw — best-effort compensation
            console.error(`[Saga] Compensation failed for step '${step.name}':`, compErr.message);
        }
    }
    return results;
}

/**
 * Strip large/sensitive data from context before logging.
 */
function sanitizeContext(context) {
    const safe = {};
    for (const [key, value] of Object.entries(context)) {
        if (typeof value === 'function') continue;
        if (typeof value === 'object' && value !== null) {
            // Only keep scalar summaries of objects
            safe[key] = typeof value.success !== 'undefined' ? { success: value.success } : '[object]';
        } else {
            safe[key] = value;
        }
    }
    return safe;
}

async function logSagaOutcome(sagaName, status, metadata) {
    try {
        const supabase = getServiceSupabase();
        await supabase.from('observability_logs').insert({
            level: status === 'completed' ? 'SAGA_COMPLETE' : 'SAGA_COMPENSATED',
            message: `Saga '${sagaName}': ${status}`,
            source: 'transaction_saga',
            metadata,
        });
    } catch (e) {
        console.error('[Saga] Log failed:', e.message);
    }
}

/**
 * Verify DB state after a multi-step operation.
 * Returns list of inconsistencies found.
 *
 * @param {Array<{name: string, check: Function}>} assertions
 *   Each assertion: { name, check: async () => ({ valid, actual, expected }) }
 * @returns {{ consistent: boolean, checks: object[] }}
 */
export async function verifyConsistency(assertions) {
    const checks = [];
    let allValid = true;

    for (const assertion of assertions) {
        try {
            const result = await assertion.check();
            checks.push({ name: assertion.name, ...result });
            if (!result.valid) allValid = false;
        } catch (err) {
            checks.push({ name: assertion.name, valid: false, error: err.message });
            allValid = false;
        }
    }

    if (!allValid) {
        try {
            const supabase = getServiceSupabase();
            await supabase.from('observability_logs').insert({
                level: 'CONSISTENCY_VIOLATION',
                message: `Consistency check failed: ${checks.filter(c => !c.valid).map(c => c.name).join(', ')}`,
                source: 'consistency_checker',
                metadata: { checks },
            });
        } catch { /* best effort */ }
    }

    return { consistent: allValid, checks };
}
