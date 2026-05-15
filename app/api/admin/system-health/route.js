import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getShosSnapshot } from '@/lib/system/shos';

export const dynamic = 'force-dynamic';

// RC-1B: Authoritative AI health source — timeout-bounded live provider probe (fail-closed)
async function probeGeminiProvider(timeoutMs = 2000) {
    if (!process.env.GEMINI_API_KEY) return 'NO_API_KEY';
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
        await Promise.race([
            model.generateContent({
                contents: [{ role: 'user', parts: [{ text: '1' }] }],
                generationConfig: { maxOutputTokens: 1 },
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('RC1B_PROBE_TIMEOUT')), timeoutMs)
            ),
        ]);
        return 'OK';
    } catch (e) {
        const msg = String(e?.message || '');
        if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) return 'QUOTA_EXHAUSTED';
        if (msg.includes('RC1B_PROBE_TIMEOUT')) return 'TIMEOUT';
        return 'PROVIDER_ERROR';
    }
}

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [
            snapshot,
            todayRes,
            failedRes,
            retryPendingRes,
            leadSyncLagRes,
            contactErrorsRes
        ] = await Promise.all([
            getShosSnapshot({ dlqLimit: 10, queueLimit: 10, deliveryLimit: 10, alertLimit: 10, errorLimit: 10 }),
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', today.toISOString()),
            supabase
                .from('failed_leads')
                .select('id', { count: 'exact', head: true }),
            supabase
                .from('failed_leads')
                .select('id', { count: 'exact', head: true })
                .lt('retry_count', 3),
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('sync_status', 'pending'),
            supabase
                .from('observability_logs')
                .select('id, message, created_at, source')
                .in('source', ['api_contact_sync', 'worker_contact_sync'])
                .gte('created_at', dayAgoIso)
                .order('created_at', { ascending: false })
                .limit(5)
        ]);

        const firstError =
            (snapshot?.success === false ? new Error(snapshot.error || 'SHOS snapshot failed') : null) ||
            todayRes.error ||
            failedRes.error ||
            retryPendingRes.error ||
            leadSyncLagRes.error ||
            contactErrorsRes.error;

        if (firstError) {
            throw firstError;
        }

        const failedLeadsCount = failedRes.count || 0;
        const failedQueueJobs = snapshot.metrics?.queue_failed || 0;
        const currentDeadLetters = snapshot.metrics?.dlq_pending || 0;
        const crmEnabled = Boolean(snapshot.feature_flags?.find((flag) => flag.key === 'crm_auto_routing')?.value);
        const aiEnabled = Boolean(snapshot.feature_flags?.find((flag) => flag.key === 'ai_enabled')?.value);
        const queuePaused = Boolean(snapshot.feature_flags?.find((flag) => flag.key === 'queue_paused')?.value);

        const crmStatus = !crmEnabled
            ? 'Paused'
            : failedLeadsCount > 0 ? 'Degraded' : 'Operational';

        // RC-1B: Authoritative AI health = live provider probe (timeout-bounded, fail-closed)
        // Probe only executes when ai_enabled=true and queue is not paused
        let geminiProbeStatus = 'SKIPPED';
        if (aiEnabled && !queuePaused) {
            geminiProbeStatus = await probeGeminiProvider(2000);
        }

        const aiStatus = !aiEnabled
            ? 'Paused'
            : queuePaused ? 'Paused'
            : (geminiProbeStatus !== 'OK' && geminiProbeStatus !== 'SKIPPED') ? 'Degraded'
            : (failedQueueJobs > 0 || currentDeadLetters > 0) ? 'Degraded'
            : 'Operational';

        return NextResponse.json({
            success: true,
            data: {
                crm_status: crmStatus,
                ai_status: aiStatus,
                queue_paused: queuePaused,
                total_leads_today: todayRes.count || 0,
                failed_leads_count: failedLeadsCount,
                retry_pending: retryPendingRes.count || 0,
                generation_backlog: snapshot.metrics?.queue_pending || 0,
                dead_letters: currentDeadLetters,
                queue_failed: failedQueueJobs,
                gemini_probe: geminiProbeStatus,
                overall_health: snapshot.metrics?.overall_health || snapshot.health?.overall_health || 'UNKNOWN',
                consistency_source: snapshot.source,
                lead_sync_lag: leadSyncLagRes.count || 0,
                recent_contact_failures: contactErrorsRes.data || [],
                last_10_errors: (snapshot.errors?.items || []).slice(0, 10).map((row) => ({
                    component: row.component || row.source_mapping?.label || row.source_type,
                    message: row.message,
                    created_at: row.created_at,
                    resolved: false,
                })),
            }
        });
    } catch (error) {
        console.error('System health API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch system health'
        }, { status: 500 });
    }
});
