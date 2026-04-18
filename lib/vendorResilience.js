/**
 * VENDOR CIRCUIT BREAKER — Per-vendor resilience layer
 * Bible Reference: Section 39, Rule 23
 * 
 * Unlike the tool-level circuit breaker (lib/system/circuitBreaker.js),
 * this operates at the VENDOR level (supabase, qstash, zoho, gemini).
 * 
 * Features:
 *   - Per-vendor circuit breaker (closed → open → half-open)
 *   - Exponential backoff retry wrapper
 *   - Persists circuit state to vendor_contracts table
 *   - SLA response time tracking → sla_snapshots
 *   - Integrates with system modes (auto-degrade on critical vendor failure)
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

// In-memory vendor state (per-instance, resets on cold start)
const vendorBreakers = new Map();

// Default config if vendor_contracts table isn't seeded yet
const DEFAULT_CONFIG = {
    cb_failure_threshold: 5,
    cb_reset_timeout_seconds: 30,
    cb_window_minutes: 2,
    retry_max_attempts: 3,
    retry_base_delay_ms: 1000,
    retry_backoff_multiplier: 2.0,
};

function getVendorBreaker(vendor) {
    if (!vendorBreakers.has(vendor)) {
        vendorBreakers.set(vendor, {
            state: 'closed',        // closed | open | half_open
            failures: [],           // timestamps of recent failures
            lastFailure: 0,
            openedAt: 0,
            config: { ...DEFAULT_CONFIG },
            configLoaded: false,
        });
    }
    return vendorBreakers.get(vendor);
}

/**
 * Load vendor config from DB (once per cold start per vendor)
 */
async function ensureConfig(vendor) {
    const breaker = getVendorBreaker(vendor);
    if (breaker.configLoaded) return breaker.config;

    try {
        const supabase = getServiceSupabase();
        const { data } = await supabase
            .from('vendor_contracts')
            .select('cb_failure_threshold, cb_reset_timeout_seconds, cb_window_minutes, retry_max_attempts, retry_base_delay_ms, retry_backoff_multiplier')
            .eq('vendor', vendor)
            .single();

        if (data) {
            breaker.config = { ...DEFAULT_CONFIG, ...data };
        }
        breaker.configLoaded = true;
    } catch {
        // Use defaults on DB failure
    }
    return breaker.config;
}

/**
 * Check if vendor circuit is open (should skip calls)
 */
export async function isVendorCircuitOpen(vendor) {
    const breaker = getVendorBreaker(vendor);
    const config = await ensureConfig(vendor);

    if (breaker.state === 'open') {
        const elapsed = Date.now() - breaker.openedAt;
        if (elapsed > config.cb_reset_timeout_seconds * 1000) {
            breaker.state = 'half_open';
            return false; // Allow one test request
        }
        return true;
    }
    return false;
}

/**
 * Record a successful vendor call — closes circuit
 */
export function recordVendorSuccess(vendor) {
    const breaker = getVendorBreaker(vendor);
    breaker.failures = [];
    breaker.state = 'closed';
}

/**
 * Record a vendor failure — may trip circuit open
 */
export async function recordVendorFailure(vendor) {
    const breaker = getVendorBreaker(vendor);
    const config = await ensureConfig(vendor);
    const now = Date.now();

    // Add failure timestamp, prune old ones outside window
    breaker.failures.push(now);
    const windowMs = config.cb_window_minutes * 60 * 1000;
    breaker.failures = breaker.failures.filter(t => now - t < windowMs);
    breaker.lastFailure = now;

    if (breaker.failures.length >= config.cb_failure_threshold) {
        breaker.state = 'open';
        breaker.openedAt = now;

        // Persist circuit state to DB
        try {
            const supabase = getServiceSupabase();
            await supabase.from('vendor_contracts')
                .update({
                    circuit_state: 'open',
                    circuit_opened_at: new Date(now).toISOString(),
                    health_status: 'down',
                    updated_at: new Date().toISOString(),
                })
                .eq('vendor', vendor);

            await supabase.from('observability_logs').insert({
                level: 'VENDOR_CIRCUIT_OPEN',
                message: `Vendor ${vendor} circuit breaker OPENED — ${breaker.failures.length} failures in ${config.cb_window_minutes}min`,
                source: 'vendor_circuit_breaker',
                metadata: { vendor, failures: breaker.failures.length, threshold: config.cb_failure_threshold },
            });
        } catch (e) {
            console.error('[VendorCB] Failed to persist:', e.message);
        }
    }
}

/**
 * Execute a function with vendor circuit breaker + exponential backoff retry
 * 
 * @param {string} vendor - Vendor name (supabase, qstash, zoho, gemini)
 * @param {Function} fn - Async function to execute
 * @param {object} options - { label, timeout }
 * @returns {object} { success, data, error, attempts, duration }
 */
export async function withVendorResilience(vendor, fn, options = {}) {
    const { label = 'call', timeout = 30000 } = options;
    const config = await ensureConfig(vendor);
    const startTime = Date.now();

    // Check circuit
    if (await isVendorCircuitOpen(vendor)) {
        return {
            success: false,
            error: `Circuit breaker OPEN for ${vendor}`,
            circuitOpen: true,
            attempts: 0,
            duration: 0,
        };
    }

    let lastError = null;
    const maxAttempts = config.retry_max_attempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Wrap in timeout
            const result = await Promise.race([
                fn(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
                ),
            ]);

            const duration = Date.now() - startTime;

            // Record success
            recordVendorSuccess(vendor);

            // Track SLA (non-blocking)
            trackSlaSnapshot(vendor, label, duration).catch(() => {});

            return { success: true, data: result, attempts: attempt, duration };
        } catch (err) {
            lastError = err;

            // Record failure
            await recordVendorFailure(vendor);

            // If circuit just opened, stop retrying
            if (await isVendorCircuitOpen(vendor)) {
                break;
            }

            // Exponential backoff (skip delay on last attempt)
            if (attempt < maxAttempts) {
                const delay = config.retry_base_delay_ms * Math.pow(config.retry_backoff_multiplier, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000)));
            }
        }
    }

    const duration = Date.now() - startTime;
    return {
        success: false,
        error: lastError?.message || 'Unknown error',
        attempts: maxAttempts,
        duration,
    };
}

/**
 * Track SLA response time snapshot (non-blocking, fire-and-forget)
 */
async function trackSlaSnapshot(vendor, metric, responseTimeMs) {
    try {
        const supabase = getServiceSupabase();
        const config = await ensureConfig(vendor);

        let status = 'normal';
        if (config.sla_response_critical_ms && responseTimeMs > config.sla_response_critical_ms) {
            status = 'critical';
        } else if (config.sla_response_warning_ms && responseTimeMs > config.sla_response_warning_ms) {
            status = 'warning';
        }

        await supabase.from('sla_snapshots').insert({
            service: vendor,
            metric: `response_time_${metric}`,
            value: responseTimeMs,
            threshold_warning: config.sla_response_warning_ms,
            threshold_critical: config.sla_response_critical_ms,
            status,
            sample_size: 1,
            window_minutes: 1,
        });

        // Update vendor health status
        if (status !== 'normal') {
            await supabase.from('vendor_contracts')
                .update({
                    health_status: status === 'critical' ? 'degraded' : 'healthy',
                    last_health_check: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('vendor', vendor);
        }
    } catch {
        // SLA tracking failure is non-fatal
    }
}

/**
 * Get all vendor circuit states (for admin dashboard)
 */
export async function getAllVendorStates() {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('vendor_contracts')
            .select('*')
            .order('criticality');

        if (error) return [];

        // Merge in-memory state for accuracy
        return (data || []).map(v => {
            const breaker = vendorBreakers.get(v.vendor);
            return {
                ...v,
                live_circuit_state: breaker?.state || v.circuit_state || 'closed',
                live_failure_count: breaker?.failures?.length || 0,
            };
        });
    } catch {
        return [];
    }
}

/**
 * Get recent SLA snapshots for a vendor
 */
export async function getVendorSla(vendor, limitHours = 24) {
    try {
        const supabase = getServiceSupabase();
        const since = new Date(Date.now() - limitHours * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
            .from('sla_snapshots')
            .select('*')
            .eq('service', vendor)
            .gte('measured_at', since)
            .order('measured_at', { ascending: false })
            .limit(100);

        return data || [];
    } catch {
        return [];
    }
}

/**
 * Get SLA summary across all vendors
 */
export async function getSlaSummary() {
    try {
        const supabase = getServiceSupabase();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { data } = await supabase
            .from('sla_snapshots')
            .select('service, status, value')
            .gte('measured_at', oneHourAgo);

        if (!data?.length) return {};

        // Group by service
        const summary = {};
        for (const row of data) {
            if (!summary[row.service]) {
                summary[row.service] = { count: 0, total_ms: 0, warnings: 0, criticals: 0, avg_ms: 0 };
            }
            const s = summary[row.service];
            s.count++;
            s.total_ms += Number(row.value);
            if (row.status === 'warning') s.warnings++;
            if (row.status === 'critical') s.criticals++;
        }

        // Compute averages
        for (const key of Object.keys(summary)) {
            summary[key].avg_ms = Math.round(summary[key].total_ms / summary[key].count);
        }

        return summary;
    } catch {
        return {};
    }
}
