/**
 * Runtime control plane for operational flags.
 *
 * Flag meaning:
 * - ai_enabled: enables AI-driven worker execution. This does NOT mean AI is production-ready.
 * - queue_paused: blocks queue consumers from processing async jobs.
 * - crm_auto_routing: allows lead submissions to push downstream into CRM automation.
 * - followup_enabled: allows follow-up worker execution when provider prerequisites exist.
 *
 * Failure mode:
 * - On any config lookup failure, the system must fail safe.
 * - Safe mode means AI off, queue paused, CRM auto-routing off, follow-up off.
 */

import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

const SAFE_DEFAULTS = Object.freeze({
    ai_enabled: false,
    queue_paused: true,
    batch_size: 5,
    crm_auto_routing: false,
    followup_enabled: false,
});

/**
 * @returns {Promise<{
 *   ai_enabled: boolean,
 *   queue_paused: boolean,
 *   batch_size: number,
 *   crm_auto_routing: boolean,
 *   followup_enabled: boolean,
 *   updated_at?: string
 * }>}
 */
export async function getSystemConfig() {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('system_control_config')
            .select('ai_enabled, queue_paused, batch_size, crm_auto_routing, followup_enabled, updated_at')
            .eq('singleton_key', true)
            .single();

        if (error || !data) {
            console.warn('[SystemConfig] Failed to fetch config, using safe defaults:', error?.message);
            return { ...SAFE_DEFAULTS };
        }

        return {
            ai_enabled: data.ai_enabled ?? SAFE_DEFAULTS.ai_enabled,
            queue_paused: data.queue_paused ?? SAFE_DEFAULTS.queue_paused,
            batch_size: data.batch_size ?? SAFE_DEFAULTS.batch_size,
            crm_auto_routing: data.crm_auto_routing ?? SAFE_DEFAULTS.crm_auto_routing,
            followup_enabled: data.followup_enabled ?? SAFE_DEFAULTS.followup_enabled,
            updated_at: data.updated_at,
        };
    } catch (err) {
        console.error('[SystemConfig] Critical failure, using safe defaults:', err.message);
        return { ...SAFE_DEFAULTS };
    }
}

/**
 * Writes an operational audit trail entry.
 * Logging must remain non-blocking so control-plane writes never break user-facing paths.
 *
 * @param {string} action  e.g. 'CONFIG_UPDATED', 'GUARD_BLOCKED'
 * @param {object} payload Arbitrary JSON metadata
 * @param {string} actor   Who triggered the action
 */
export async function logSystemAction(action, payload = {}, actor = 'system') {
    try {
        const supabase = getServiceSupabase();
        await supabase.from('observability_logs').insert({
            level: 'INFO',
            message: action,
            metadata: payload,
            source: actor,
        });
    } catch (err) {
        console.error('[SystemLog] Failed to write log:', err.message);
    }
}
