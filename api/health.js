import { redis } from './_middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import { withLogger } from './_middleware/logger.js';

// --- Health Check Endpoint ---
// Verifies Redis connectivity and optionally Supabase.
// Returns 200 if all critical dependencies are reachable, 500 otherwise.

export default withLogger(async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const health = {
        status: 'ok',
        redis: 'unknown',
        supabase: 'skipped',
        timestamp: new Date().toISOString()
    };

    let hasFailure = false;

    // 1. Redis Check (reuses shared connection)
    try {
        const pong = await redis.ping();

        if (pong === 'PONG') {
            health.redis = 'connected';
        } else {
            health.redis = 'unexpected_response';
            hasFailure = true;
        }
    } catch (err) {
        health.redis = 'disconnected';
        hasFailure = true;
        console.error('Health: Redis check failed:', err.message);
    }

    // 2. Supabase Check (only if enabled)
    const isSupabaseEnabled = process.env.SUPABASE_ENABLED === 'true';

    if (isSupabaseEnabled) {
        try {
            if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
                throw new Error('Supabase credentials not configured');
            }

            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Lightweight query to verify connectivity
            const { error } = await supabase.from('leads').select('id').limit(1);

            if (error) {
                throw error;
            }

            health.supabase = 'ok';
        } catch (err) {
            health.supabase = 'error';
            hasFailure = true;
            console.error('Health: Supabase check failed:', err.message);
        }
    }

    if (hasFailure) {
        health.status = 'degraded';
        return res.status(500).json(health);
    }

    return res.status(200).json(health);
});
