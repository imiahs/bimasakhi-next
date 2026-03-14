import { redis } from './_middleware/auth.js';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withLogger } from './_middleware/logger.js';

// --- Health Check Endpoint ---
// Verifies Redis, Supabase, and worker queue status.
// Returns 200 if all critical dependencies are reachable, 500 otherwise.

export default withLogger(async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const health = {
        status: 'ok',
        redis: 'unknown',
        supabase: 'skipped',
        queues: 'skipped',
        workers: 'skipped',
        timestamp: new Date().toISOString()
    };

    let hasFailure = false;

    // 1. Redis Check (reuses shared connection)
    try {
        const start = Date.now();
        const pong = await Promise.race([
            redis.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        const latency = Date.now() - start;

        if (pong === 'PONG') {
            health.redis = 'connected';
            health.redis_latency_ms = latency;
        } else {
            health.redis = 'unexpected_response';
            hasFailure = true;
        }
    } catch (err) {
        health.redis = 'disconnected';
        health.redis_error = err.message;
        hasFailure = true;
        console.error('Health: Redis check failed:', err.message);
    }

    // 2. Supabase Check
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            health.supabase = 'not_configured';
        } else {
            const supabase = getServiceSupabase();
            const start = Date.now();
            const { error } = await supabase.from('admin_users').select('id').limit(1);
            const latency = Date.now() - start;

            if (error) throw error;

            health.supabase = 'connected';
            health.supabase_latency_ms = latency;
        }
    } catch (err) {
        health.supabase = 'error';
        health.supabase_error = err.message;
        hasFailure = true;
        console.error('Health: Supabase check failed:', err.message);
    }

    // 3. Queue Status (check BullMQ queue depths via Redis keys)
    try {
        if (health.redis === 'connected') {
            const queueNames = [
                'PageGeneratorQueue', 'ContentAuditQueue', 'IndexQueue',
                'CacheQueue', 'CrawlBudgetQueue', 'NetworkMetricsQueue'
            ];
            const depths = {};
            for (const name of queueNames) {
                const waiting = await redis.llen(`bull:${name}:wait`);
                const active = await redis.llen(`bull:${name}:active`);
                depths[name] = { waiting, active };
            }
            health.queues = depths;
        }
    } catch (err) {
        health.queues = 'error';
        console.error('Health: Queue check failed:', err.message);
    }

    // 4. Worker Health (latest heartbeats from worker_health table)
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && serviceKey && health.supabase === 'connected') {
            const supabase = getServiceSupabase();
            const { data, error } = await supabase
                .from('worker_health')
                .select('worker_name, status, last_heartbeat, jobs_processed, failures')
                .order('last_heartbeat', { ascending: false })
                .limit(10);

            if (!error && data) {
                health.workers = data;
            }
        }
    } catch (err) {
        health.workers = 'error';
        console.error('Health: Worker health check failed:', err.message);
    }

    if (hasFailure) {
        health.status = 'degraded';
        return res.status(500).json(health);
    }

    return res.status(200).json(health);
});
