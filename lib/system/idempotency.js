/**
 * IDEMPOTENCY LAYER — ensureIdempotent(eventId)
 * Prevents duplicate execution of the same event.
 * Uses Supabase as durable store (no Redis dependency).
 * 
 * PRODUCTION HARDENED:
 * - Atomic claim via INSERT with conflict detection
 * - Uses idempotency_keys table with UNIQUE(idempotency_key)
 * - Falls back to observability_logs if table doesn't exist yet
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export async function ensureIdempotent(eventId, scope = 'default') {
    if (!eventId) return { duplicate: false };

    const supabase = getServiceSupabase();
    const key = `${scope}:${eventId}`;

    // Atomic claim: INSERT will fail on duplicate key (UNIQUE constraint)
    // This eliminates the race condition between check and claim
    const { data, error } = await supabase
        .from('idempotency_keys')
        .insert({
            idempotency_key: key,
            scope,
            event_id: eventId,
            claimed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

    if (error) {
        // If conflict (duplicate key), this is a known duplicate
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
            return { duplicate: true, key };
        }

        // If table doesn't exist yet, fall back to non-atomic (graceful degradation)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.warn('[Idempotency] idempotency_keys table missing — falling back to observability_logs');
            return await fallbackIdempotencyCheck(supabase, key, eventId, scope);
        }

        // Unknown error — assume not duplicate to avoid blocking
        console.error('[Idempotency] Unexpected error:', error.message);
        return { duplicate: false, error: error.message };
    }

    return { duplicate: false, claim_id: data?.id };
}

// Legacy fallback until idempotency_keys table is created
async function fallbackIdempotencyCheck(supabase, key, eventId, scope) {
    const { data } = await supabase
        .from('observability_logs')
        .select('id')
        .eq('source', 'idempotency')
        .eq('message', key)
        .limit(1);

    if (data && data.length > 0) {
        return { duplicate: true, existing_id: data[0].id };
    }

    await supabase.from('observability_logs').insert({
        level: 'IDEMPOTENCY_CLAIM',
        message: key,
        source: 'idempotency',
        metadata: { event_id: eventId, scope, claimed_at: new Date().toISOString() },
    });

    return { duplicate: false };
}
