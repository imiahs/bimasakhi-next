/**
 * LEAD STATE MACHINE — Enforces valid lead lifecycle transitions.
 * 
 * States: NEW → SCORED → ASSIGNED → CONTACTED → CONVERTED / LOST
 * 
 * RULES:
 * - No backward transitions (except CONTACTED → ASSIGNED for re-routing)
 * - Every transition is logged
 * - Invalid transitions are rejected, not silently ignored
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const LeadStates = {
    NEW:       'new',
    SCORED:    'scored',
    ASSIGNED:  'assigned',
    CONTACTED: 'contacted',
    CONVERTED: 'converted',
    LOST:      'lost',
};

// Allowed transitions: from → [to, to, ...]
const TRANSITIONS = {
    [LeadStates.NEW]:       [LeadStates.SCORED],
    [LeadStates.SCORED]:    [LeadStates.ASSIGNED, LeadStates.LOST],
    [LeadStates.ASSIGNED]:  [LeadStates.CONTACTED, LeadStates.LOST],
    [LeadStates.CONTACTED]: [LeadStates.CONVERTED, LeadStates.LOST, LeadStates.ASSIGNED],
    [LeadStates.CONVERTED]: [],
    [LeadStates.LOST]:      [],
};

export function canTransition(from, to) {
    const allowed = TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
}

/**
 * Attempt a state transition for a lead.
 * Returns: { success, from, to, error? }
 * 
 * CONSISTENCY ENFORCEMENT:
 * - Validates transition BEFORE update
 * - Verifies state AFTER update (read-back check)
 * - Rejects if post-update state doesn't match expected
 */
export async function transitionLead(leadId, targetState, metadata = {}) {
    const supabase = getServiceSupabase();

    // Get current state
    const { data: lead, error: fetchErr } = await supabase
        .from('leads')
        .select('id, status')
        .eq('id', leadId)
        .single();

    if (fetchErr || !lead) {
        return { success: false, error: `Lead ${leadId} not found` };
    }

    const currentState = lead.status || LeadStates.NEW;

    // PRE-UPDATE: Validate transition
    if (!canTransition(currentState, targetState)) {
        await logTransition(leadId, currentState, targetState, false, 'invalid_transition', metadata);
        return {
            success: false,
            from: currentState,
            to: targetState,
            error: `Invalid transition: ${currentState} → ${targetState}`,
        };
    }

    // Apply transition with optimistic lock on current state
    const { error: updateErr, data: updated } = await supabase
        .from('leads')
        .update({ status: targetState })
        .eq('id', leadId)
        .eq('status', currentState)  // Optimistic lock — only update if state hasn't changed
        .select('status')
        .single();

    if (updateErr || !updated) {
        await logTransition(leadId, currentState, targetState, false, updateErr?.message || 'concurrent_state_change', metadata);
        return { success: false, from: currentState, to: targetState, error: updateErr?.message || 'State changed concurrently — retry needed' };
    }

    // POST-UPDATE: Verify state is what we expect
    if (updated.status !== targetState) {
        await logTransition(leadId, currentState, targetState, false, `post_update_mismatch: expected=${targetState}, actual=${updated.status}`, metadata);
        return { success: false, from: currentState, to: targetState, error: `Post-update verification failed: state is ${updated.status}, expected ${targetState}` };
    }

    await logTransition(leadId, currentState, targetState, true, null, metadata);

    return { success: true, from: currentState, to: targetState };
}

async function logTransition(leadId, from, to, success, error, metadata) {
    try {
        const supabase = getServiceSupabase();
        await supabase.from('observability_logs').insert({
            level: success ? 'STATE_TRANSITION' : 'STATE_TRANSITION_FAILED',
            message: `Lead ${leadId}: ${from} → ${to}${error ? ' (' + error + ')' : ''}`,
            source: 'lead_state_machine',
            metadata: {
                lead_id: leadId,
                from_state: from,
                to_state: to,
                success,
                error,
                ...metadata,
            },
        });
    } catch (e) {
        console.error('[LeadState] Log failed:', e.message);
    }
}
