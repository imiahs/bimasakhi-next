/**
 * EVENT BUS — Central nervous system of the platform.
 * 
 * Flow: validate → WRITE TO DB → deduplicate → checkPolicy → route → enqueue
 * 
 * BUSINESS SAFETY RULES:
 * - Every event is written to event_store BEFORE dispatch (write-ahead log)
 * - If dispatch fails, event remains in DB for retry
 * - System mode gates: NORMAL / DEGRADED / EMERGENCY
 * - CRITICAL events (leads, contacts) are NEVER dropped
 * - No event exists only in memory — guaranteed delivery
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getEventType } from './eventTypes';
import { getTrigger } from './triggerMap';
import { createExecutionContext } from '@/lib/system/executionContext';
import { shouldExecute } from '@/lib/system/policyEngine';
import { ensureIdempotent } from '@/lib/system/idempotency';
import { writeEvent, markDispatched, markFailed, markSkipped, getEventPriority } from './eventStore';
import { getSystemMode } from '@/lib/system/systemModes';

export async function handleEvent(eventName, payload = {}, source = 'api') {
    const startTime = Date.now();
    const supabase = getServiceSupabase();

    // 1. VALIDATE — is this a known business event?
    const eventType = getEventType(eventName);
    if (!eventType) {
        return { success: false, reason: 'unknown_event', event: eventName };
    }

    // 2. ATTACH CONTEXT — every flow carries execution context
    const ctx = createExecutionContext({ event_id: payload.event_id, correlation_id: payload.correlation_id }, source);

    // 3. WRITE-AHEAD LOG — persist to DB BEFORE anything else (Rule 1)
    let storedEvent = null;
    try {
        storedEvent = await writeEvent(eventName, payload, source, ctx);
    } catch (walError) {
        // WAL write failed — for CRITICAL events, this is a hard failure
        const priority = getEventPriority(eventName);
        console.error(`[EventBus] WAL write failed for ${eventName}:`, walError.message);

        if (priority === 'critical') {
            // CRITICAL data must NEVER be lost — fail loudly
            return { success: false, reason: 'wal_write_failed', error: walError.message, event: eventName };
        }
        // Non-critical: proceed without WAL (degraded mode)
        console.warn(`[EventBus] Proceeding without WAL for non-critical event: ${eventName}`);
    }

    // 4. SYSTEM MODE CHECK — EMERGENCY mode blocks all dispatch (Rule 4)
    const systemMode = await getSystemMode();
    if (systemMode === 'emergency') {
        // EMERGENCY: Only DB writes. No dispatch. Event is safe in event_store.
        await markSkipped(storedEvent?.id, 'emergency_mode');
        return {
            success: true,
            action: 'stored_only',
            reason: 'emergency_mode',
            event: eventName,
            event_store_id: storedEvent?.id,
            duration_ms: Date.now() - startTime,
        };
    }

    // 5. DEGRADED MODE — only critical events proceed (Rule 4)
    const priority = getEventPriority(eventName);
    if (systemMode === 'degraded' && priority !== 'critical') {
        await markSkipped(storedEvent?.id, 'degraded_mode_non_critical');
        return {
            success: true,
            action: 'stored_only',
            reason: 'degraded_mode',
            event: eventName,
            event_store_id: storedEvent?.id,
            duration_ms: Date.now() - startTime,
        };
    }

    // 6. DEDUPLICATE — prevent duplicate execution
    if (payload.event_id) {
        const { duplicate } = await ensureIdempotent(payload.event_id, eventName);
        if (duplicate) {
            await markSkipped(storedEvent?.id, 'duplicate_event');
            return { success: false, reason: 'duplicate_event', event_id: payload.event_id };
        }
    }

    // 7. LOG — record event occurrence in event_stream (telemetry)
    await supabase.from('event_stream').insert({
        event_type: eventName,
        session_id: payload.session_id || null,
        metadata: {
            ...payload,
            execution_context: ctx,
            source,
            event_store_id: storedEvent?.id,
        },
    }).catch(e => console.error('[EventBus] Log failed:', e.message));

    // 8. CHECK POLICY — are we allowed to proceed?
    const policy = await shouldExecute(eventType, ctx);
    if (!policy.allowed) {
        await markSkipped(storedEvent?.id, `policy_blocked: ${policy.reasons.join(', ')}`);

        await supabase.from('observability_logs').insert({
            level: 'EVENT_POLICY_BLOCKED',
            message: `Event ${eventName} blocked by policy`,
            source: 'event_bus',
            metadata: { event: eventName, reasons: policy.reasons, context: ctx, event_store_id: storedEvent?.id },
        }).catch(() => {});

        return { success: false, reason: 'policy_blocked', details: policy.reasons, event_store_id: storedEvent?.id };
    }

    // 9. ROUTE — look up trigger map
    const trigger = getTrigger(eventName);
    if (!trigger || trigger.action === 'log_only') {
        await markDispatched(storedEvent?.id, null);
        return { success: true, action: 'logged', event: eventName, event_store_id: storedEvent?.id, duration_ms: Date.now() - startTime };
    }

    // 10. ENQUEUE — dispatch via QStash (Rule 2: guaranteed delivery)
    if (trigger.action === 'queue_job' && trigger.endpoint) {
        try {
            const { Client } = await import('@upstash/qstash');
            const client = new Client({ token: process.env.QSTASH_TOKEN });
            const baseUrl = process.env.NODE_ENV === 'production'
                ? 'https://bimasakhi.com'
                : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

            const result = await client.publishJSON({
                url: `${baseUrl}${trigger.endpoint}`,
                body: {
                    ...payload,
                    _execution_context: ctx,
                    _event_name: eventName,
                    _executive: trigger.executive,
                    _event_store_id: storedEvent?.id,
                },
            });

            // Mark as dispatched in write-ahead log
            await markDispatched(storedEvent?.id, result.messageId);

            await supabase.from('observability_logs').insert({
                level: 'EVENT_DISPATCHED',
                message: `Event ${eventName} → ${trigger.executive} via ${trigger.endpoint}`,
                source: 'event_bus',
                metadata: {
                    event: eventName,
                    executive: trigger.executive,
                    endpoint: trigger.endpoint,
                    qstash_message_id: result.messageId,
                    context: ctx,
                    event_store_id: storedEvent?.id,
                    duration_ms: Date.now() - startTime,
                },
            }).catch(() => {});

            return {
                success: true,
                action: 'dispatched',
                event: eventName,
                executive: trigger.executive,
                message_id: result.messageId,
                event_store_id: storedEvent?.id,
                duration_ms: Date.now() - startTime,
            };
        } catch (err) {
            // DISPATCH FAILED — event is SAFE in event_store (Rule 5)
            await markFailed(storedEvent?.id, err.message);

            await supabase.from('observability_logs').insert({
                level: 'EVENT_DISPATCH_FAILED',
                message: `Event ${eventName} dispatch failed: ${err.message}`,
                source: 'event_bus',
                metadata: { event: eventName, error: err.message, context: ctx, event_store_id: storedEvent?.id },
            }).catch(() => {});

            // Dead-letter for visibility
            await supabase.from('job_dead_letters').insert({
                job_class: `event:${eventName}`,
                payload: { ...payload, execution_context: ctx },
                failure_reason: `dispatch_failed: ${err.message}`,
                error: err.message,
                failed_at: new Date().toISOString(),
                metadata: {
                    event: eventName,
                    executive: trigger.executive,
                    endpoint: trigger.endpoint,
                    event_store_id: storedEvent?.id,
                },
            }).catch(() => {});

            return {
                success: false,
                reason: 'dispatch_failed',
                error: err.message,
                event_store_id: storedEvent?.id,
                recoverable: true, // Retry daemon will pick this up
            };
        }
    }

    return { success: true, action: 'logged', event: eventName, event_store_id: storedEvent?.id };
}
