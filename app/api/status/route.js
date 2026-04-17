import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getSystemMode } from '@/lib/system/systemModes';
import { getAllFeatureFlags } from '@/lib/system/featureFlags';

export const dynamic = 'force-dynamic';

/**
 * GET /api/status
 * 
 * Production health check. Returns system status without auth.
 * Used by uptime monitors, load balancers, and deployment verification.
 * 
 * Does NOT expose sensitive data — only status booleans and mode.
 */
export async function GET() {
    const checks = {
        db: 'unknown',
        qstash_configured: false,
        redis_configured: false,
        system_mode: 'unknown',
    };
    let healthy = true;

    // 1. Database connectivity
    try {
        const supabase = getServiceSupabase();
        const { error } = await supabase.from('system_control_config').select('singleton_key').limit(1);
        checks.db = error ? 'error' : 'ok';
        if (error) healthy = false;
    } catch {
        checks.db = 'error';
        healthy = false;
    }

    // 2. System mode
    try {
        checks.system_mode = await getSystemMode();
        if (checks.system_mode === 'emergency') healthy = false;
    } catch {
        checks.system_mode = 'unknown';
    }

    // 3. External service config (not connectivity — just that tokens exist)
    checks.qstash_configured = !!process.env.QSTASH_TOKEN;
    checks.redis_configured = !!process.env.REDIS_URL;

    // 4. Feature flags
    let flags = {};
    try {
        flags = await getAllFeatureFlags();
    } catch { /* non-fatal */ }

    const status = healthy ? 'ok' : 'degraded';

    return NextResponse.json({
        status,
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        checks,
        feature_flags: Object.fromEntries(
            Object.entries(flags).map(([k, v]) => [k, v.value])
        ),
        timestamp: new Date().toISOString(),
    }, { status: healthy ? 200 : 503 });
}
