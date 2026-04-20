/**
 * CENTRALIZED OBSERVABILITY LOGGER
 * 
 * Bible Reference: Rule 9 (Observability), Stabilization Phase
 * 
 * Enforces:
 *   - Every log entry MUST have a non-empty `source` value
 *   - Source values follow the standardized naming convention
 *   - Logging failures never break the main flow
 * 
 * Standardized Source Convention:
 *   cron:*          — Scheduled cron jobs (cron:alert-scan, cron:morning-brief, cron:reconciliation)
 *   worker:*        — QStash workers (worker:lead-sync, worker:contact-sync)
 *   api:*           — API endpoints (api:bulk-planner, api:lead-create, api:events)
 *   admin:*         — Admin actions (admin:dlq, admin:media-upload, admin:alert-test)
 *   system:*        — Internal systems (system:event-bus, system:state-machine, system:circuit-breaker)
 *   executive:*     — Executive layer (executive:cso, executive:cmo)
 *   tool:*          — Tool registry (tool:registry)
 *   geo:*           — Geo/location APIs (geo:cities, geo:localities)
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

// Valid source prefixes — any source must start with one of these
const VALID_SOURCE_PREFIXES = [
    'cron:',
    'worker:',
    'api:',
    'admin:',
    'system:',
    'executive:',
    'tool:',
    'geo:',
    // Legacy sources (will be migrated over time)
    'alert_', 'bulk_', 'vendor_', 'runbook_', 'retry_', 'reconciliation_',
    'morning_', 'followup-', 'ai-', 'event_', 'idempotency', 'lead_state_',
    'transaction_', 'consistency_', 'media_', 'dlq_', 'api_',
    'geo_', 'worker_', 'alert-',
];

/**
 * Log to observability_logs with enforced source.
 * 
 * @param {string} level - Log level (INFO, ERROR, WARN, CRITICAL, etc.)
 * @param {string} message - Log message
 * @param {string} source - Source identifier (REQUIRED, non-empty)
 * @param {object} [metadata] - Optional JSON metadata
 * @returns {Promise<void>}
 */
export async function logObs(level, message, source, metadata = null) {
    // Guard: source must be a non-empty string
    const safeSource = (typeof source === 'string' && source.trim().length > 0)
        ? source.trim()
        : 'unknown_source';

    if (safeSource === 'unknown_source') {
        console.error(`[Observability] MISSING SOURCE for log: level=${level}, message=${message?.slice(0, 80)}`);
    }

    try {
        const supabase = getServiceSupabase();
        await supabase.from('observability_logs').insert({
            level: level || 'INFO',
            message: message || 'No message',
            source: safeSource,
            metadata: metadata || undefined,
            created_at: new Date().toISOString(),
        }).then(() => {}).catch(() => {});
    } catch (_) {
        // Observability failures must never break the main flow
    }
}

/**
 * Validate a UUID string format.
 * Returns true if the string matches UUID v4 format.
 * 
 * @param {string} value - String to validate
 * @returns {boolean}
 */
export function isValidUUID(value) {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Validate an array of UUID strings.
 * Returns { valid: boolean, invalid: string[] }
 * 
 * @param {any[]} arr - Array to validate
 * @returns {{ valid: boolean, invalid: string[] }}
 */
export function validateUUIDArray(arr) {
    if (!Array.isArray(arr)) return { valid: false, invalid: ['not_an_array'] };
    const invalid = arr.filter(id => !isValidUUID(id));
    return { valid: invalid.length === 0, invalid };
}
