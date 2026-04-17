import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getRetryableEvents, incrementRetry, markDispatched, markFailed, markStuckAsFailed } from '@/lib/events/eventStore';
import { getTrigger } from '@/lib/events/triggerMap';
import { getSystemMode } from '@/lib/system/systemModes';
import { getEventPriority } from '@/lib/events/eventStore';

export const maxDuration = 60;

/**
 * RETRY DAEMON — Scans event_store for failed/pending events and re-dispatches.
 * 
 * Scheduled via QStash cron (every 5 minutes).
 * Only runs in NORMAL or DEGRADED mode.
 * In DEGRADED mode, only retries CRITICAL events.
 * 
 * QStash Schedule:
 *   URL: https://bimasakhi.com/api/jobs/event-retry
 *   Cron: * /5 * * * *   (every 5 minutes)
 */
async function handler(request) {
    const startTime = Date.now();
    const results = { retried: 0, failed: 0, skipped: 0, stuck_detected: 0, errors: [] };

    // Check system mode
    const mode = await getSystemMode();
    if (mode === 'emergency') {
        return NextResponse.json({
            success: true,
            message: 'Retry daemon skipped — system in EMERGENCY mode',
            mode,
        });
    }

    // STUCK EVENT DETECTION (Rule 3) — runs BEFORE retry scan
    // Events stuck at 'dispatched' with no worker ACK → mark failed for retry
    try {
        const stuckResult = await markStuckAsFailed();
        results.stuck_detected = stuckResult.marked;
        if (stuckResult.marked > 0) {
            console.log(`[RetryDaemon] Detected ${stuckResult.marked} stuck events → marked failed for retry`);
        }
    } catch (stuckErr) {
        console.error('[RetryDaemon] Stuck detection failed:', stuckErr.message);
    }

    // Get retryable events from event_store
    const events = await getRetryableEvents(20);

    if (!events.length) {
        return NextResponse.json({
            success: true,
            message: 'No events to retry',
            duration_ms: Date.now() - startTime,
        });
    }

    const supabase = getServiceSupabase();

    for (const event of events) {
        // In DEGRADED mode, skip non-critical events
        if (mode === 'degraded' && event.priority !== 'critical') {
            results.skipped++;
            continue;
        }

        // Look up trigger for this event
        const trigger = getTrigger(event.event_name);
        if (!trigger || trigger.action !== 'queue_job' || !trigger.endpoint) {
            results.skipped++;
            continue;
        }

        try {
            // Increment retry count
            await incrementRetry(event.id);

            // Re-dispatch via QStash
            const { Client } = await import('@upstash/qstash');
            const client = new Client({ token: process.env.QSTASH_TOKEN });
            const baseUrl = process.env.NODE_ENV === 'production'
                ? 'https://bimasakhi.com'
                : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

            const result = await client.publishJSON({
                url: `${baseUrl}${trigger.endpoint}`,
                body: {
                    ...event.payload,
                    _execution_context: event.execution_context,
                    _event_name: event.event_name,
                    _executive: trigger.executive,
                    _event_store_id: event.id,
                    _retry_count: (event.retry_count || 0) + 1,
                },
            });

            await markDispatched(event.id, result.messageId);
            results.retried++;

            // Log retry success
            await supabase.from('observability_logs').insert({
                level: 'RETRY_DISPATCHED',
                message: `Retry: ${event.event_name} (attempt ${(event.retry_count || 0) + 1})`,
                source: 'retry_daemon',
                metadata: {
                    event_store_id: event.id,
                    event_name: event.event_name,
                    retry_count: (event.retry_count || 0) + 1,
                    message_id: result.messageId,
                },
            }).catch(() => {});

        } catch (err) {
            results.failed++;
            results.errors.push({ event_id: event.id, event_name: event.event_name, error: err.message });

            await markFailed(event.id, err.message);

            // If max retries exceeded, dead-letter it
            if ((event.retry_count || 0) + 1 >= event.max_retries) {
                await supabase.from('job_dead_letters').insert({
                    job_class: `event:${event.event_name}`,
                    payload: event.payload,
                    failure_reason: `max_retries_exhausted (${event.max_retries})`,
                    error: err.message,
                    failed_at: new Date().toISOString(),
                    metadata: {
                        event_store_id: event.id,
                        retry_count: (event.retry_count || 0) + 1,
                        priority: event.priority,
                    },
                }).catch(() => {});

                await supabase.from('observability_logs').insert({
                    level: event.priority === 'critical' ? 'CRITICAL_EVENT_DEAD_LETTERED' : 'EVENT_DEAD_LETTERED',
                    message: `Event ${event.event_name} exhausted all ${event.max_retries} retries — dead-lettered`,
                    source: 'retry_daemon',
                    metadata: { event_store_id: event.id, priority: event.priority },
                }).catch(() => {});
            }
        }
    }

    const duration = Date.now() - startTime;

    // Log daemon run
    await supabase.from('observability_logs').insert({
        level: 'RETRY_DAEMON_RUN',
        message: `Retry daemon: ${results.retried} retried, ${results.failed} failed, ${results.skipped} skipped, ${results.stuck_detected} stuck detected`,
        source: 'retry_daemon',
        metadata: { ...results, duration_ms: duration, mode },
    }).catch(() => {});

    return NextResponse.json({
        success: true,
        ...results,
        duration_ms: duration,
        mode,
    });
}

export const POST = verifySignatureAppRouter(handler);
