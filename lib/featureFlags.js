/**
 * Feature Flags & Safe Mode Control
 * Phase 14: Super Admin Panel
 * 
 * Key-value feature toggle system. Every automated system checks its flag
 * before executing. Safe Mode halts ALL automated operations.
 */

import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

const CONTROL_PLANE_FLAGS = Object.freeze({
    safe_mode: {
        key: 'safe_mode',
        label: 'SAFE MODE (Emergency Pause)',
        description: 'Halts ALL automated operations. Read-only mode.',
        category: 'system',
        restricted: true,
        defaultValue: false,
    },
    pagegen_enabled: {
        key: 'pagegen_enabled',
        label: 'Page Generation (AI)',
        description: 'Controls whether new pages can be generated via AI.',
        category: 'generation',
        restricted: false,
        defaultValue: false,
    },
    bulk_generation_enabled: {
        key: 'bulk_generation_enabled',
        label: 'Bulk Job Planner',
        description: 'Controls whether bulk generation jobs can be created.',
        category: 'generation',
        restricted: true,
        defaultValue: false,
    },
});

const DEFAULT_FEATURE_FLAGS = Object.freeze({
    cms_unified_resolver_enabled: {
        key: 'cms_unified_resolver_enabled',
        label: 'CMS Unified Resolver',
        description: 'Phase 2.1 foundation flag. Disabled until the unified CMS resolver is wired in a later routing phase.',
        category: 'system',
        restricted: true,
        defaultValue: false,
    },
    cms_nested_urls_enabled: {
        key: 'cms_nested_urls_enabled',
        label: 'CMS Nested URLs',
        description: 'Phase 2.1 foundation flag. Disabled until nested URL routing is implemented in a later phase.',
        category: 'system',
        restricted: true,
        defaultValue: false,
    },
    ai_prompt_templates_enabled: {
        key: 'ai_prompt_templates_enabled',
        label: 'AI Prompt Templates',
        description: 'Phase 2.1 foundation flag. Disabled until DB-backed prompt templates are implemented in a later phase.',
        category: 'generation',
        restricted: true,
        defaultValue: false,
    },
});

function isControlPlaneFlag(key) {
    return Boolean(CONTROL_PLANE_FLAGS[key]);
}

function isDefaultFeatureFlag(key) {
    return Boolean(DEFAULT_FEATURE_FLAGS[key]);
}

function buildControlPlaneFlag(flag, value, changedBy = null, changedAt = null) {
    return {
        key: flag.key,
        label: flag.label,
        description: flag.description,
        category: flag.category,
        value: value === true,
        restricted: flag.restricted,
        source: 'system_control_config',
        last_changed_by: changedBy,
        last_changed_at: changedAt,
    };
}

function buildDefaultFeatureFlag(flag, value = flag.defaultValue, changedBy = null, changedAt = null) {
    return {
        key: flag.key,
        label: flag.label,
        description: flag.description,
        category: flag.category,
        value: value === true,
        restricted: flag.restricted,
        source: 'code_default',
        last_changed_by: changedBy,
        last_changed_at: changedAt,
    };
}

async function getControlPlaneRow(columns) {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
        .from('system_control_config')
        .select(columns)
        .eq('singleton_key', true)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

/**
 * Get a single feature flag value by key.
 * Returns false on any failure (fail-safe).
 */
export async function getFeatureFlag(key) {
    try {
        if (isControlPlaneFlag(key)) {
            const row = await getControlPlaneRow(key);
            if (!row) return CONTROL_PLANE_FLAGS[key].defaultValue;
            return row[key] === true;
        }

        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('feature_flags')
            .select('value')
            .eq('key', key)
            .single();

        if (error || !data) {
            return isDefaultFeatureFlag(key) ? DEFAULT_FEATURE_FLAGS[key].defaultValue : false;
        }
        return data.value === true;
    } catch {
        return isDefaultFeatureFlag(key) ? DEFAULT_FEATURE_FLAGS[key].defaultValue : false;
    }
}

/**
 * Get all feature flags grouped by category.
 */
export async function getAllFeatureFlags() {
    try {
        const controlColumns = `${Object.keys(CONTROL_PLANE_FLAGS).join(', ')}, updated_at`;
        const [controlRow, legacyResult] = await Promise.all([
            getControlPlaneRow(controlColumns),
            getServiceSupabase()
                .from('feature_flags')
                .select('*')
                .order('category')
                .order('label'),
        ]);

        const controlFlags = Object.values(CONTROL_PLANE_FLAGS).map((flag) => buildControlPlaneFlag(
            flag,
            controlRow?.[flag.key] ?? flag.defaultValue,
            null,
            controlRow?.updated_at ?? null,
        ));

        const defaultFlags = Object.values(DEFAULT_FEATURE_FLAGS).map((flag) => buildDefaultFeatureFlag(flag));

        const { data, error } = legacyResult;
        if (error || !data) return [...controlFlags, ...defaultFlags];

        const legacyFlags = data.filter((flag) => !isControlPlaneFlag(flag.key));
        const legacyFlagKeys = new Set(legacyFlags.map((flag) => flag.key));
        const missingDefaultFlags = defaultFlags.filter((flag) => !legacyFlagKeys.has(flag.key));

        return [...controlFlags, ...missingDefaultFlags, ...legacyFlags];
    } catch {
        const controlFlags = Object.values(CONTROL_PLANE_FLAGS).map((flag) => buildControlPlaneFlag(
            flag,
            flag.defaultValue,
            null,
            null,
        ));
        const defaultFlags = Object.values(DEFAULT_FEATURE_FLAGS).map((flag) => buildDefaultFeatureFlag(flag));
        return [...controlFlags, ...defaultFlags];
    }
}

/**
 * Update a feature flag value.
 * Restricted flags can only be toggled by super_admin.
 */
export async function updateFeatureFlag(key, value, changedBy = 'system') {
    const nextValue = Boolean(value);

    try {
        if (isControlPlaneFlag(key)) {
            const supabase = getServiceSupabase();
            const changedAt = new Date().toISOString();
            const { error } = await supabase
                .from('system_control_config')
                .upsert(
                    {
                        singleton_key: true,
                        [key]: nextValue,
                        updated_at: changedAt,
                    },
                    { onConflict: 'singleton_key' },
                );

            if (error) throw error;

            await supabase.from('observability_logs').insert({
                level: key === 'safe_mode' ? 'CRITICAL' : 'INFO',
                message: 'CONTROL_PLANE_TOGGLED',
                source: changedBy,
                metadata: { key, value: nextValue, source: 'system_control_config' },
            }).then(() => {}).catch(() => {});

            return buildControlPlaneFlag(CONTROL_PLANE_FLAGS[key], nextValue, changedBy, changedAt);
        }

        const supabase = getServiceSupabase();
        const changedAt = new Date().toISOString();
        const defaultFlag = DEFAULT_FEATURE_FLAGS[key];
        const payload = defaultFlag
            ? {
                key: defaultFlag.key,
                label: defaultFlag.label,
                description: defaultFlag.description,
                category: defaultFlag.category,
                restricted: defaultFlag.restricted,
                value: nextValue,
                last_changed_by: changedBy,
                last_changed_at: changedAt,
            }
            : {
                value: nextValue,
                last_changed_by: changedBy,
                last_changed_at: changedAt,
            };

        const query = defaultFlag
            ? supabase.from('feature_flags').upsert(payload, { onConflict: 'key' }).select()
            : supabase.from('feature_flags').update(payload).eq('key', key).select();

        const { data, error } = await query.single();

        if (error) throw error;

        // Audit log
        await supabase.from('observability_logs').insert({
            level: key === 'safe_mode' ? 'CRITICAL' : 'INFO',
            message: `FEATURE_FLAG_TOGGLED`,
            source: changedBy,
            metadata: { key, value: nextValue, previous: !nextValue },
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
        const row = await getControlPlaneRow('safe_mode');
        if (!row) return true; // fail-safe: assume paused
        return row.safe_mode === true;
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
        const safeMode = await checkSafeMode();
        if (safeMode) return false;
        return await getFeatureFlag(flagKey);
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
