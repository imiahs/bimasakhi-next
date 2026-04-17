/**
 * SYSTEM MODES — Controls system behavior under stress.
 * 
 * NORMAL:    Full system — all events dispatched, AI enabled
 * DEGRADED:  Disable AI, only CRITICAL events processed (leads, contacts)
 * EMERGENCY: Only DB writes. No queue dispatch. Events saved for later retry.
 * 
 * Mode is stored in system_control_config.system_mode
 * Falls back to 'normal' if column doesn't exist yet.
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

const VALID_MODES = ['normal', 'degraded', 'emergency'];

/**
 * Get current system mode from DB.
 * Returns 'normal' on any failure (fail-safe for operations).
 */
export async function getSystemMode() {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('system_control_config')
            .select('system_mode')
            .eq('singleton_key', true)
            .single();

        if (error || !data) return 'normal';

        const mode = data.system_mode || 'normal';
        return VALID_MODES.includes(mode) ? mode : 'normal';
    } catch {
        return 'normal';
    }
}

/**
 * Set system mode. Admin only.
 * Returns the new mode or error.
 */
export async function setSystemMode(newMode) {
    if (!VALID_MODES.includes(newMode)) {
        return { success: false, error: `Invalid mode. Valid: ${VALID_MODES.join(', ')}` };
    }

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('system_control_config')
            .update({
                system_mode: newMode,
                updated_at: new Date().toISOString(),
            })
            .eq('singleton_key', true)
            .select('system_mode')
            .single();

        if (error) {
            // Column might not exist yet
            if (error.message?.includes('system_mode') || error.code === '42703') {
                return { success: false, error: 'system_mode column not yet created. Run scripts/create_event_store.sql' };
            }
            return { success: false, error: error.message };
        }

        return { success: true, mode: data.system_mode };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Get mode description for admin display.
 */
export function getModeDescription(mode) {
    const descriptions = {
        normal: 'Full system — all events dispatched, AI enabled',
        degraded: 'Limited — AI disabled, only critical events (leads/contacts) processed',
        emergency: 'DB-only — no dispatch, events stored for later recovery',
    };
    return descriptions[mode] || 'Unknown mode';
}
