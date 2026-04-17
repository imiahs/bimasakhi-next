/**
 * FEATURE FLAGS — Runtime toggles for safe deployments
 * 
 * Uses system_control_config as the feature flag store.
 * All flags default to OFF (fail-safe).
 * 
 * Usage:
 *   import { isFeatureEnabled, setFeatureFlag } from '@/lib/system/featureFlags';
 *   if (await isFeatureEnabled('ai_enabled')) { ... }
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

// Known feature flags with descriptions
const FEATURE_FLAGS = {
    ai_enabled:         { description: 'AI scoring and routing', default: false },
    followup_enabled:   { description: 'Automated follow-up messages', default: false },
    crm_auto_routing:   { description: 'Auto CRM lead routing', default: false },
    queue_paused:       { description: 'Queue dispatch paused (true = paused)', default: true },
};

/**
 * Check if a feature flag is enabled.
 * Returns the safe default on any failure.
 */
export async function isFeatureEnabled(flagName) {
    const flag = FEATURE_FLAGS[flagName];
    if (!flag) return false;

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('system_control_config')
            .select(flagName)
            .eq('singleton_key', true)
            .single();

        if (error || !data) return flag.default;
        return data[flagName] ?? flag.default;
    } catch {
        return flag.default;
    }
}

/**
 * Set a feature flag value. Admin only.
 */
export async function setFeatureFlag(flagName, value) {
    if (!FEATURE_FLAGS[flagName]) {
        return { success: false, error: `Unknown flag: ${flagName}. Valid: ${Object.keys(FEATURE_FLAGS).join(', ')}` };
    }

    try {
        const supabase = getServiceSupabase();
        const { error } = await supabase
            .from('system_control_config')
            .update({ [flagName]: value, updated_at: new Date().toISOString() })
            .eq('singleton_key', true);

        if (error) return { success: false, error: error.message };

        await supabase.from('observability_logs').insert({
            level: 'FEATURE_FLAG_CHANGED',
            message: `Flag '${flagName}' set to ${value}`,
            source: 'feature_flags',
            metadata: { flag: flagName, value },
        }).catch(() => {});

        return { success: true, flag: flagName, value };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Get all feature flag states.
 */
export async function getAllFeatureFlags() {
    try {
        const supabase = getServiceSupabase();
        const columns = Object.keys(FEATURE_FLAGS).join(', ');
        const { data, error } = await supabase
            .from('system_control_config')
            .select(columns)
            .eq('singleton_key', true)
            .single();

        if (error || !data) {
            // Return defaults
            const defaults = {};
            for (const [key, flag] of Object.entries(FEATURE_FLAGS)) {
                defaults[key] = { value: flag.default, description: flag.description, source: 'default' };
            }
            return defaults;
        }

        const result = {};
        for (const [key, flag] of Object.entries(FEATURE_FLAGS)) {
            result[key] = { value: data[key] ?? flag.default, description: flag.description, source: 'db' };
        }
        return result;
    } catch {
        const defaults = {};
        for (const [key, flag] of Object.entries(FEATURE_FLAGS)) {
            defaults[key] = { value: flag.default, description: flag.description, source: 'default' };
        }
        return defaults;
    }
}

export { FEATURE_FLAGS };
