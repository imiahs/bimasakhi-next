/**
 * Safe Supabase Operations
 * 
 * All methods are 100% fail-safe: they will never throw,
 * never crash the caller, and never block the response.
 * Failed operations emit console.warn only.
 */

let _client = null;

function getClient() {
    if (_client) return _client;

    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key) return null;

        const { createClient } = require('@supabase/supabase-js');
        _client = createClient(url, key, {
            auth: { persistSession: false }
        });
        return _client;
    } catch {
        return null;
    }
}

/**
 * Non-blocking insert. Never throws. Never awaits.
 * Call without `await` for fire-and-forget telemetry.
 */
export function safeInsert(table, payload) {
    try {
        const supabase = getClient();
        if (!supabase) return;

        supabase
            .from(table)
            .insert(payload)
            .then(({ error }) => {
                if (error) {
                    console.warn(`[SafeInsert] ${table}:`, error.message);
                }
            })
            .catch((err) => {
                console.warn(`[SafeInsert] ${table} network error:`, err.message);
            });
    } catch {
        // Absolute last resort — swallow silently
    }
}

/**
 * Non-blocking upsert. Same safety guarantees as safeInsert.
 */
export function safeUpsert(table, payload, onConflict) {
    try {
        const supabase = getClient();
        if (!supabase) return;

        supabase
            .from(table)
            .upsert(payload, onConflict ? { onConflict } : undefined)
            .then(({ error }) => {
                if (error) {
                    console.warn(`[SafeUpsert] ${table}:`, error.message);
                }
            })
            .catch((err) => {
                console.warn(`[SafeUpsert] ${table} network error:`, err.message);
            });
    } catch {
        // Absolute last resort — swallow silently
    }
}
