/**
 * BACKPRESSURE + AUTO-SCALING STRATEGY
 * 
 * LEVELS:
 * - GREEN:  Normal operation — full throughput
 * - YELLOW: Defer non-critical work (followups, content gen)
 * - RED:    Only critical pipeline (lead capture) + reject everything else
 * 
 * Detection: based on recent failure rate in job_runs
 * 
 * AUTO-SCALING STRATEGY (Vercel + QStash):
 * 
 * Vercel serverless functions auto-scale by nature (cold start per request).
 * The constraint isn't "scaling workers up" — it's "throttling to prevent cost explosion."
 * 
 * WHEN TO THROTTLE:
 *   - YELLOW: batch_size reduced to 3, AI disabled, followups paused
 *   - RED: batch_size = 1, only lead capture pipeline, all async deferred
 * 
 * WHEN TO SCALE (handled by Vercel automatically):
 *   - Normal traffic: Vercel handles 0→N function instances
 *   - Burst traffic: QStash retries with backoff absorb spikes
 *   - Event store acts as buffer (events written to DB, dispatched when capacity exists)
 * 
 * COST VS PERFORMANCE:
 *   - QStash: $1/100k messages (~free tier for our volume)
 *   - Vercel: Function invocations capped by plan (Pro: 1M/month)
 *   - Supabase: Connection pooling via Supavisor (default on hosted)
 *   - AI: $5/day budget enforced by aiCostGuard.js
 *   - TOTAL monthly budget: ~$50 (Vercel Pro + Supabase Pro + QStash Free)
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

const WINDOW_MINUTES = 15;
const YELLOW_THRESHOLD = 0.3; // 30% failures
const RED_THRESHOLD = 0.6;    // 60% failures

export async function getSystemPressure() {
    const supabase = getServiceSupabase();

    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    const { data: jobs } = await supabase
        .from('job_runs')
        .select('status')
        .gte('created_at', windowStart);

    if (!jobs || jobs.length === 0) {
        return { level: 'green', failure_rate: 0, total_jobs: 0 };
    }

    const failures = jobs.filter(j => j.status === 'failed').length;
    const failureRate = failures / jobs.length;

    let level = 'green';
    if (failureRate >= RED_THRESHOLD) level = 'red';
    else if (failureRate >= YELLOW_THRESHOLD) level = 'yellow';

    return {
        level,
        failure_rate: Math.round(failureRate * 100),
        total_jobs: jobs.length,
        failed_jobs: failures,
        window_minutes: WINDOW_MINUTES,
    };
}

/**
 * Check if a specific event category should be processed given current pressure.
 * @param {string} category - 'critical' | 'normal' | 'deferred'
 */
export async function shouldProcessUnderPressure(category) {
    const pressure = await getSystemPressure();

    if (pressure.level === 'green') return { allowed: true, pressure };

    if (pressure.level === 'yellow') {
        // Only allow critical and normal
        if (category === 'deferred') {
            return { allowed: false, reason: 'backpressure_yellow', pressure };
        }
        return { allowed: true, pressure };
    }

    // RED — only critical
    if (category !== 'critical') {
        return { allowed: false, reason: 'backpressure_red', pressure };
    }
    return { allowed: true, pressure };
}

/**
 * Get throttle config based on current pressure level.
 * Used by event-retry daemon and batch processors to self-limit.
 */
export async function getThrottleConfig() {
    const pressure = await getSystemPressure();

    const configs = {
        green:  { batch_size: 20, retry_batch: 10, dispatch_delay_ms: 0,    ai_allowed: true,  followup_allowed: true  },
        yellow: { batch_size: 5,  retry_batch: 3,  dispatch_delay_ms: 1000, ai_allowed: false, followup_allowed: false },
        red:    { batch_size: 1,  retry_batch: 1,  dispatch_delay_ms: 3000, ai_allowed: false, followup_allowed: false },
    };

    return {
        pressure,
        throttle: configs[pressure.level] || configs.green,
    };
}
