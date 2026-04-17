/**
 * AI COST GUARD — Tracks and limits AI spend.
 * 
 * RULES:
 * - Daily budget: $5 (configurable)
 * - Per-tool budget: $1
 * - Auto-fallback to cheaper model when 80% budget consumed
 * - Hard stop at 100%
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

const DAILY_BUDGET_USD = 5.0;
const PER_TOOL_BUDGET_USD = 1.0;
const FALLBACK_THRESHOLD = 0.8; // 80%

export async function checkAICostBudget(toolName = null) {
    const supabase = getServiceSupabase();
    const today = new Date().toISOString().split('T')[0];

    // Get today's total AI spend from observability_logs
    const { data: logs } = await supabase
        .from('observability_logs')
        .select('metadata')
        .gte('created_at', `${today}T00:00:00Z`)
        .in('level', ['TOOL_SUCCESS', 'TOOL_FAILURE'])
        .not('metadata->cost', 'is', null);

    let totalSpend = 0;
    let toolSpend = 0;

    if (logs) {
        for (const log of logs) {
            const cost = log.metadata?.cost || 0;
            totalSpend += cost;
            if (toolName && log.metadata?.tool === toolName) {
                toolSpend += cost;
            }
        }
    }

    const dailyPct = totalSpend / DAILY_BUDGET_USD;
    const toolPct = toolName ? toolSpend / PER_TOOL_BUDGET_USD : 0;

    // Hard stop
    if (dailyPct >= 1.0) {
        return {
            allowed: false,
            reason: 'daily_budget_exhausted',
            total_spend: totalSpend,
            budget: DAILY_BUDGET_USD,
        };
    }

    if (toolName && toolPct >= 1.0) {
        return {
            allowed: false,
            reason: 'tool_budget_exhausted',
            tool: toolName,
            tool_spend: toolSpend,
            tool_budget: PER_TOOL_BUDGET_USD,
        };
    }

    // Fallback recommendation
    const useFallbackModel = dailyPct >= FALLBACK_THRESHOLD;

    return {
        allowed: true,
        total_spend: totalSpend,
        daily_budget: DAILY_BUDGET_USD,
        daily_pct: Math.round(dailyPct * 100),
        use_fallback_model: useFallbackModel,
        recommended_model: useFallbackModel ? 'gemini-2.5-flash-lite' : 'gemini-2.0-flash',
    };
}
