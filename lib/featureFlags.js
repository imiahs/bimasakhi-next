/**
 * Feature Flags & Safe Mode Control
 * Phase 14: Super Admin Panel
 * 
 * Key-value feature toggle system. Every automated system checks its flag
 * before executing. Safe Mode halts ALL automated operations.
 */

import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

/**
 * Get a single feature flag value by key.
 * Returns false on any failure (fail-safe).
 */
export async function getFeatureFlag(key) {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('feature_flags')
            .select('value')
            .eq('key', key)
            .single();

        if (error || !data) return false;
        return data.value === true;
    } catch {
        return false;
    }
}

/**
 * Get all feature flags grouped by category.
 */
export async function getAllFeatureFlags() {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('feature_flags')
            .select('*')
            .order('category')
            .order('label');

        if (error || !data) return [];
        return data;
    } catch {
        return [];
    }
}

/**
 * Update a feature flag value.
 * Restricted flags can only be toggled by super_admin.
 */
export async function updateFeatureFlag(key, value, changedBy = 'system') {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('feature_flags')
            .update({
                value: Boolean(value),
                last_changed_by: changedBy,
                last_changed_at: new Date().toISOString(),
            })
            .eq('key', key)
            .select()
            .single();

        if (error) throw error;

        // Audit log
        await supabase.from('observability_logs').insert({
            level: key === 'safe_mode' ? 'CRITICAL' : 'INFO',
            message: `FEATURE_FLAG_TOGGLED`,
            source: changedBy,
            metadata: { key, value: Boolean(value), previous: !Boolean(value) },
        }).then(() => {}).catch(() => {});

        return data;
    } catch (err) {
        console.error('[FeatureFlags] Update failed:', err.message);
        return null;
    }
}

/**
 * Check if Safe Mode is active.
 * Safe Mode = ALL automated operations halt. Read-only system.
 * Returns true (system paused) on any error (fail-safe).
 */
export async function checkSafeMode() {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('feature_flags')
            .select('value')
            .eq('key', 'safe_mode')
            .single();

        if (error || !data) return true; // fail-safe: assume paused
        return data.value === true;
    } catch {
        return true; // fail-safe
    }
}

/**
 * Check if a specific system is enabled (combines feature flag + safe mode).
 * Returns false if safe_mode is ON or the specific flag is OFF.
 */
export async function isSystemEnabled(flagKey) {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('feature_flags')
            .select('key, value')
            .in('key', ['safe_mode', flagKey]);

        if (error || !data) return false;

        const safeMode = data.find(f => f.key === 'safe_mode');
        const flag = data.find(f => f.key === flagKey);

        // If safe mode is ON, everything is disabled
        if (safeMode?.value === true) return false;
        // If the specific flag is OFF, it's disabled
        if (!flag || flag.value !== true) return false;

        return true;
    } catch {
        return false;
    }
}

/**
 * Get all workflow config values.
 */
export async function getAllWorkflowConfig() {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('workflow_config')
            .select('*')
            .order('category')
            .order('label');

        if (error || !data) return [];
        return data;
    } catch {
        return [];
    }
}

/**
 * Get a single workflow config value by key.
 */
export async function getWorkflowValue(key) {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('workflow_config')
            .select('value_type, value_number, value_text')
            .eq('key', key)
            .single();

        if (error || !data) return null;
        return data.value_type === 'text' ? data.value_text : data.value_number;
    } catch {
        return null;
    }
}

/**
 * Update a workflow config value.
 */
export async function updateWorkflowValue(key, value, changedBy = 'system') {
    try {
        const supabase = getServiceSupabase();

        // Get the config to determine type and validate range
        const { data: existing } = await supabase
            .from('workflow_config')
            .select('value_type, min_value, max_value')
            .eq('key', key)
            .single();

        if (!existing) return { error: 'Config key not found' };

        const update = {
            last_changed_by: changedBy,
            last_changed_at: new Date().toISOString(),
        };

        if (existing.value_type === 'text') {
            update.value_text = String(value);
        } else {
            const numVal = Number(value);
            if (isNaN(numVal)) return { error: 'Value must be a number' };
            if (existing.min_value !== null && numVal < existing.min_value) {
                return { error: `Value must be >= ${existing.min_value}` };
            }
            if (existing.max_value !== null && numVal > existing.max_value) {
                return { error: `Value must be <= ${existing.max_value}` };
            }
            update.value_number = numVal;
        }

        const { data, error } = await supabase
            .from('workflow_config')
            .update(update)
            .eq('key', key)
            .select()
            .single();

        if (error) throw error;

        // Audit log
        await supabase.from('observability_logs').insert({
            level: 'INFO',
            message: 'WORKFLOW_CONFIG_UPDATED',
            source: changedBy,
            metadata: { key, value, previous: existing.value_type === 'text' ? existing.value_text : existing.value_number },
        }).then(() => {}).catch(() => {});

        return { data };
    } catch (err) {
        console.error('[WorkflowConfig] Update failed:', err.message);
        return { error: err.message };
    }
}
