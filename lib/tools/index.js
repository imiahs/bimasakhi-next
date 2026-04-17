/**
 * TOOL REGISTRY — Every tool has a contract.
 * 
 * Contract: input validation → execute → output validation → cost tracking
 * 
 * RULES:
 * - No tool without contract
 * - No execution without input validation
 * - Every tool has: timeout, retries, cost
 * - Circuit breaker enforced
 */
import { isCircuitOpen, recordSuccess, recordFailure } from '@/lib/system/circuitBreaker';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

const TOOL_REGISTRY = {};

export function registerTool(name, config) {
    TOOL_REGISTRY[name] = {
        name,
        timeout: config.timeout || 30000,
        retries: config.retries || 2,
        costPerCall: config.costPerCall || 0,
        validateInput: config.validateInput || (() => ({ valid: true })),
        validateOutput: config.validateOutput || (() => ({ valid: true })),
        verifyDbState: config.verifyDbState || null,  // Post-execution DB verification
        execute: config.execute,
        version: config.version || '1.0.0',
    };
}

export function getTool(name) {
    return TOOL_REGISTRY[name] || null;
}

export function listTools() {
    return Object.keys(TOOL_REGISTRY).map(name => ({
        name,
        timeout: TOOL_REGISTRY[name].timeout,
        retries: TOOL_REGISTRY[name].retries,
        version: TOOL_REGISTRY[name].version,
        costPerCall: TOOL_REGISTRY[name].costPerCall,
    }));
}

/**
 * Execute a tool with full contract enforcement.
 * Returns: { success, result, error, duration_ms, cost, retries_used }
 */
export async function executeTool(name, input, executionContext = {}) {
    const tool = getTool(name);
    if (!tool) {
        return { success: false, error: `Tool '${name}' not found` };
    }

    // Circuit breaker check
    if (isCircuitOpen(name)) {
        return { success: false, error: `Tool '${name}' circuit is OPEN (too many failures)` };
    }

    // Input validation
    const inputCheck = tool.validateInput(input);
    if (!inputCheck.valid) {
        return { success: false, error: `Input validation failed: ${inputCheck.reason}` };
    }

    const startTime = Date.now();
    let lastError = null;
    let retriesUsed = 0;

    for (let attempt = 0; attempt <= tool.retries; attempt++) {
        try {
            // Execute with timeout
            const result = await Promise.race([
                tool.execute(input, executionContext),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Tool '${name}' timed out after ${tool.timeout}ms`)), tool.timeout)
                ),
            ]);

            // Output validation
            const outputCheck = tool.validateOutput(result);
            if (!outputCheck.valid) {
                throw new Error(`Output validation failed: ${outputCheck.reason}`);
            }

            recordSuccess(name);

            const duration = Date.now() - startTime;

            // POST-EXECUTION: Verify DB state if contract defines it
            let dbVerification = null;
            if (tool.verifyDbState) {
                try {
                    dbVerification = await tool.verifyDbState(input, result);
                    if (!dbVerification.valid) {
                        logDbContractViolation(name, input, dbVerification, executionContext).catch(() => {});
                    }
                } catch (verifyErr) {
                    dbVerification = { valid: false, error: verifyErr.message };
                }
            }

            // Log execution
            logToolExecution(name, true, duration, tool.costPerCall, executionContext).catch(() => {});

            return {
                success: true,
                result,
                duration_ms: duration,
                cost: tool.costPerCall,
                retries_used: retriesUsed,
            };
        } catch (err) {
            lastError = err;
            retriesUsed = attempt + 1;
        }
    }

    // All retries exhausted — dead-letter (Rule 6)
    await recordFailure(name);

    const duration = Date.now() - startTime;
    logToolExecution(name, false, duration, 0, executionContext, lastError?.message).catch(() => {});
    deadLetterTool(name, input, executionContext, lastError?.message, retriesUsed).catch(() => {});

    return {
        success: false,
        error: lastError?.message || 'Unknown error',
        duration_ms: duration,
        cost: 0,
        retries_used: retriesUsed,
    };
}

async function logToolExecution(toolName, success, durationMs, cost, ctx, errorMsg) {
    try {
        const supabase = getServiceSupabase();
        await supabase.from('observability_logs').insert({
            level: success ? 'TOOL_SUCCESS' : 'TOOL_FAILURE',
            message: `${toolName}: ${success ? 'completed' : 'failed'}${errorMsg ? ' — ' + errorMsg : ''}`,
            source: 'tool_registry',
            metadata: {
                tool: toolName,
                success,
                duration_ms: durationMs,
                cost,
                event_id: ctx.event_id,
                correlation_id: ctx.correlation_id,
            },
        });
    } catch (e) {
        console.error('[ToolRegistry] Log failed:', e.message);
    }
}

/**
 * Dead-letter a tool execution after all retries are exhausted.
 * Writes to job_dead_letters table for admin visibility and manual retry.
 */
async function deadLetterTool(toolName, input, ctx, errorMsg, retriesUsed) {
    try {
        const supabase = getServiceSupabase();
        await supabase.from('job_dead_letters').insert({
            job_class: `tool:${toolName}`,
            payload: { input, execution_context: ctx },
            failure_reason: errorMsg || 'retries_exhausted',
            error: errorMsg || 'retries_exhausted',
            failed_at: new Date().toISOString(),
            metadata: {
                tool: toolName,
                retries_used: retriesUsed,
                event_id: ctx.event_id,
                correlation_id: ctx.correlation_id,
            },
        });
    } catch (e) {
        console.error('[ToolRegistry] Dead-letter write failed:', e.message);
    }
}

/**
 * Log when a tool's post-execution DB verification fails.
 * This means the tool said "success" but the DB doesn't reflect expected changes.
 */
async function logDbContractViolation(toolName, input, verification, ctx) {
    try {
        const supabase = getServiceSupabase();
        await supabase.from('observability_logs').insert({
            level: 'DB_CONTRACT_VIOLATION',
            message: `Tool '${toolName}': DB state doesn't match expected contract`,
            source: 'tool_registry',
            metadata: {
                tool: toolName,
                input,
                verification,
                event_id: ctx.event_id,
                correlation_id: ctx.correlation_id,
            },
        });
    } catch (e) {
        console.error('[ToolRegistry] Contract violation log failed:', e.message);
    }
}
