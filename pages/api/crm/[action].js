// api/crm/[action].js
// Consolidated CRM handler: create-lead + create-contact
import axios from 'axios';
import crypto from 'crypto';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { redis } from '../_middleware/auth.js';
import { withLogger } from '../_middleware/logger.js';
import { getZohoAccessToken, getZohoApiDomain } from '../_middleware/zoho.js';
import { safeLog } from '@/lib/safeLogger.js';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';
import { enqueuePageGeneration } from '@/lib/queue/publisher.js';
import { getEventRoutePath } from '@/lib/events/routePath';
import { handleEvent } from '@/lib/events/bus';

let systemBootLogged = false;

// --- Shared Utilities ---
function assertEnv(vars) {
    const missing = vars.filter(v => !process.env[v]);
    if (missing.length) {
        throw new Error(`Missing required ENV: ${missing.join(', ')}`);
    }
}

const normalizeMobile = (mobile = '') => {
    const cleaned = mobile.toString().replace(/\D/g, '');
    return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
};

function generateRefId(now = new Date()) {
    const timestamp = now.toISOString().replace(/\D/g, '').slice(0, 17);
    const randomPart = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return `LEAD-${timestamp}-${randomPart}`;
}

async function selectLeadByMobileCompat(supabaseClient, normalizedMobile) {
    const fieldsWithRefId = 'id, ref_id, city, created_at, zoho_lead_id, full_name';
    const fieldsWithoutRefId = 'id, city, created_at, zoho_lead_id, full_name';

    const result = await supabaseClient
        .from('leads')
        .select(fieldsWithRefId)
        .eq('mobile', normalizedMobile)
        .maybeSingle();

    if (!result.error || !result.error.message?.includes('ref_id')) {
        return result;
    }

    return supabaseClient
        .from('leads')
        .select(fieldsWithoutRefId)
        .eq('mobile', normalizedMobile)
        .maybeSingle();
}

async function insertLeadWithRefId(supabaseClient, payload) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const refId = generateRefId();
        const { data, error } = await supabaseClient
            .from('leads')
            .insert({
                ...payload,
                ref_id: refId
            })
            .select()
            .single();

        if (!error) {
            return { data, refId };
        }

        const errorText = [error.message, error.details, error.hint].filter(Boolean).join(' ');
        const isRefIdConflict = error.code === '23505' && /ref_id/i.test(errorText);

        if (!isRefIdConflict) {
            throw error;
        }
    }

    throw new Error('Unable to generate a unique ref_id after 5 attempts');
}

// --- Safe Supabase Initialization ---
let supabase = null;
try {
    const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (dbUrl && dbKey) {
        supabase = getServiceSupabase();
    } else {
        console.warn("Supabase credentials missing. Supabase will be skipped.");
    }
} catch (e) {
    console.error("Supabase Init Error:", e);
}

import { rateLimit } from '@/utils/rateLimiter.js';

async function insertContactInquiryCompat(supabaseClient, record) {
    const createdAt = new Date().toISOString();
    const candidates = [
        {
            label: 'next',
            payload: {
                ...record,
                sync_status: 'pending',
                created_at: createdAt
            }
        },
        {
            label: 'phase1',
            payload: {
                contact_id: record.contact_id,
                name: record.name,
                mobile: record.mobile,
                email: record.email,
                reason: record.reason,
                message: record.message,
                source: record.source,
                pipeline: record.pipeline,
                tag: record.tag,
                created_at: createdAt
            }
        },
        {
            label: 'legacy_minimal',
            payload: {
                contact_id: record.contact_id,
                name: record.name,
                mobile: record.mobile,
                email: record.email,
                reason: record.reason,
                message: record.message,
                created_at: createdAt
            }
        }
    ];

    let lastError = null;
    for (const candidate of candidates) {
        const { error } = await supabaseClient
            .from('contact_inquiries')
            .insert([candidate.payload]);

        if (!error) {
            return { inserted: true, mode: candidate.label };
        }

        lastError = error;
        console.warn(`create-contact: contact_inquiries fallback failed (${candidate.label})`, error.message);
    }

    return { inserted: false, error: lastError };
}

async function updateContactSyncStatusCompat(supabaseClient, contactId, status) {
    const { error } = await supabaseClient
        .from('contact_inquiries')
        .update({ sync_status: status })
        .eq('contact_id', contactId);

    if (error) {
        console.warn(`create-contact: sync_status update skipped (${status})`, error.message);
    }
}

// ============================================================
// ACTION: create-lead
// ============================================================
async function handleCreateLead(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';
    const rateLimitResult = await rateLimit(`apply_lead:${ip}`, 10, 3600); // 10 leads per hour per IP
    if (!rateLimitResult.success) {
        return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    }

    if (!systemBootLogged) {
        try {
            const commitHash = process.env.VERCEL_GIT_COMMIT_SHA || 'local';
            safeLog('SYSTEM_BOOT', 'Deployment successful', {
                timestamp: new Date().toISOString(),
                version: commitHash
            });
            systemBootLogged = true;
        } catch (e) {
            console.error("Boot log failed", e);
        }
    }

    const requiredEnvs = ['REDIS_URL', 'ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'];
    for (const envStr of requiredEnvs) {
        if (!process.env[envStr]) {
            console.error("Missing ENV:", envStr);
            return res.status(500).json({ error: "Server Misconfigured" });
        }
    }

    // --- INPUT VALIDATION & NORMALIZATION ---
    console.log("== RAW CRM PAYLOAD ==", JSON.stringify(req.body, null, 2));
    let {
        name, mobile, email,
        pincode, city, state, locality,
        education, occupation, reason,
        conversion_source: requestedConversionSource,
        source, medium, campaign, visitedPages,
        session_id,
        // Tasks 2 & 3: Lead Attribution
        lead_source_page, lead_source_type
    } = req.body;

    const conversionSource =
        (typeof requestedConversionSource === 'string' && requestedConversionSource.trim()) ||
        (typeof source === 'string' && source.trim()) ||
        'website_form';

    // Normalize Mobile BEFORE Validation
    const normalizedMobile = normalizeMobile(mobile);

    // TASK 5: Add Debug Logging
    console.log("[CRM DEBUG PAYLOAD]", {
        name,
        mobile: normalizedMobile,
        city,
        occupation,
        email,
        pincode,
        source
    });

    // TASK 4: Backend Hardening (Failsafe Only)
    // Fallback normalization (NON-BREAKING)
    const isCityMissing = !city;
    if (!city) {
        city = 'Unknown';
    }
    occupation = occupation || 'Not Specified';
    source = source || 'Website';

    if (!name || !normalizedMobile || !email || !pincode) {
        console.error("[CRM VALIDATION FAILED]", req.body);
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(normalizedMobile)) {
        console.error("[CRM VALIDATION FAILED]", req.body);
        return res.status(400).json({ error: 'Invalid Indian mobile number' });
    }

    if (!source) {
        console.error("[CRM VALIDATION FAILED]", req.body);
        return res.status(400).json({ error: 'Missing mandatory metadata: source' });
    }

    // --- IDEMPOTENCY CHECK (Atomic Redis Lock) ---
    const idempotencyKey = `lead_submit:${normalizedMobile}`;

    const locked = await redis.set(idempotencyKey, '1', 'NX', 'EX', 300);

    if (!locked) {
        console.info(JSON.stringify({
            type: 'lead_duplicate_blocked',
            mobile: normalizedMobile,
            source
        }));
        return res.status(200).json({ success: true, duplicate: true });
    }

    // --- SUPABASE FLOW (SAFE & HARDENED) ---

    const isSupabaseEnabled = supabase !== null;

    let isDuplicate = false;
    let supabaseLeadId = null;
    let existingLeadData = null;
    let refId = null;

    if (isSupabaseEnabled) {
        try {
            // A. Check for Duplicate (Optimistic Check)
            const { data: existingLead, error: checkError } = await selectLeadByMobileCompat(supabase, normalizedMobile);

            if (checkError) {
                console.error("Supabase Check Error:", checkError);
            } else if (existingLead) {
                isDuplicate = true;
                existingLeadData = existingLead;

                // Log Duplicate Event
                const { error: auditLogErr } = await supabase.from('lead_events').insert({
                    lead_id: existingLead.id,
                    event_type: 'duplicate_detected',
                    metadata: { attempt_source: source }
                });
                if (auditLogErr) console.error("Audit Log Error:", auditLogErr);
            }

            // B. Insert New Lead (If Not Duplicate)
            if (!isDuplicate) {
                try {
                    const { data: newLead, refId: insertedRefId } = await insertLeadWithRefId(supabase, {
                            full_name: name,
                            mobile: normalizedMobile,
                            email,
                            city,
                            state,
                            pincode,
                            locality,
                            education,
                            occupation,
                            source,
                            conversion_source: conversionSource,
                            medium,
                            campaign,
                            status: 'new'
                            // Removed is_city_missing to prevent PGRST204 (Missing Column) cache failures
                        });

                    supabaseLeadId = newLead.id;
                    refId = newLead.ref_id || insertedRefId;

                    // Log Metadata
                    const { error: metaLogErr } = await supabase.from('lead_metadata').insert({
                        lead_id: newLead.id,
                        utm_source: source,
                        utm_medium: medium,
                        utm_campaign: campaign,
                        visited_pages: visitedPages,
                        user_agent: req.headers['user-agent']
                    });
                    if (metaLogErr) console.error("Meta Log Error:", metaLogErr);

                    // Log Creation Event
                    const { error: eventLogErr } = await supabase.from('lead_events').insert({
                        lead_id: newLead.id,
                        event_type: 'created'
                    });
                    if (eventLogErr) console.error("Event Log Error:", eventLogErr);

                    // Phase 19: Lead Intelligence — Journey tracking (scoring delegated to CMO executive)
                    if (session_id) {
                        if (isSupabaseEnabled && supabase) {
                            // Fetch Journey Events from Supabase
                            const { data: eventsData, error: eventErr } = await supabase
                                .from('event_stream')
                                .select('event_type, event_name, payload, route_path, metadata, created_at')
                                .eq('session_id', session_id)
                                .order('created_at', { ascending: true });

                            const events = eventsData || [];

                            let journeySteps = events.map(e => ({
                                action: e.event_type,
                                path: getEventRoutePath(e),
                                time: e.created_at
                            }));

                            // Save Journey (scoring is done by CMO executive via tool system)
                            await supabase.from('lead_journeys').insert({
                                lead_id: newLead.id,
                                session_id: session_id,
                                steps: journeySteps,
                                conversion_point: lead_source_page
                            });
                        }
                    }

                    // Phase 19: Content Analytics Lead Counter
                    try {
                        if (lead_source_page) {
                            supabase.from('content_metrics').select('leads_generated, id').eq('target_path', lead_source_page).maybeSingle()
                                .then(({ data }) => {
                                    if (data) {
                                        supabase.from('content_metrics').update({ leads_generated: data.leads_generated + 1, updated_at: new Date() }).eq('id', data.id).then();
                                    } else {
                                        supabase.from('content_metrics').insert({ target_path: lead_source_page, leads_generated: 1 }).then();
                                    }
                                });
                        }

                        if (source) {
                            supabase.from('traffic_sources').select('leads, id').eq('source', source).maybeSingle()
                                .then(({ data }) => {
                                    if (data) {
                                        supabase.from('traffic_sources').update({ leads: data.leads + 1, updated_at: new Date() }).eq('id', data.id).then();
                                    } else {
                                        supabase.from('traffic_sources').insert({ source, medium, campaign, leads: 1 }).then();
                                    }
                                });
                        }
                    } catch (metricErr) {
                        console.error('Lead Metric Error:', metricErr);
                    }

                    // Phase 27: PIPELINE CONNECTION (CRM -> AI -> SEO)
                    // Phase 27: PIPELINE CONNECTION (CRM -> AI -> SEO)
                    // UPDATED: Duplicate-safe slug generation
                    // - City page: 1 page per city (lic-agent-in-delhi)
                    // - Locality page: 1 page per locality (lic-agent-in-krishna-nagar-delhi)
                    if (city && city !== 'Unknown') {
                        try {
                            // 1. Map string city to UUID
                            let targetCityId = null;
                            const { data: cityMatch } = await supabase
                                .from('cities')
                                .select('id, city_name')
                                .ilike('city_name', city.trim())
                                .limit(1)
                                .maybeSingle();

                            if (cityMatch) {
                                targetCityId = cityMatch.id;
                            }
                            // Note: Removed default city fallback — unknown cities should NOT generate pages

                            if (targetCityId) {
                                const cleanCity = city.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                let queueIdsToDispatch = [];

                                // CITY PAGE — 1 per city, no timestamp
                                const citySlug = `lic-bima-sakhi-career-agency-in-${cleanCity}`;

                                // Check: page already exists in page_index?
                                const { data: existingPage } = await supabase
                                    .from('page_index')
                                    .select('id')
                                    .eq('page_slug', citySlug)
                                    .maybeSingle();

                                // Check: already in queue?
                                const { data: existingQueue } = await supabase
                                    .from('generation_queue')
                                    .select('id')
                                    .eq('task_type', 'pagegen')
                                    .in('status', ['pending', 'processing'])
                                    .filter('payload->>created_by', 'eq', 'crm_auto')
                                    .filter('payload->pages->0->>slug', 'eq', citySlug)
                                    .maybeSingle();

                                if (!existingPage && !existingQueue) {
                                    // Queue city page — only if not exists
                                    const { data: qCity } = await supabase.from('generation_queue').insert({
                                        task_type: 'pagegen',
                                        status: 'pending',
                                        progress: 0,
                                        total_items: 1,
                                        payload: {
                                            version: 1,
                                            priority: 1,
                                            created_by: 'crm_auto',
                                            pages: [{
                                                slug: citySlug,
                                                city_name: city.trim(), // Pass city name explicitly
                                                keyword_text: `LIC Agent Job in ${city.trim()}`,
                                                city_id: targetCityId,
                                                page_type: 'city_page',
                                                content_level: 'city'
                                            }]
                                        }
                                    }).select('id').single();

                                    if (qCity?.id) queueIdsToDispatch.push(qCity.id);

                                    console.log(`[Pipeline] Queued city page: ${citySlug}`);

                                } else {
                                    console.log(`[Pipeline] Skipped — page already exists or queued: ${citySlug}`);
                                }

                                // LOCALITY PAGE — 1 per locality (if locality provided)
                                if (locality && locality.trim()) {
                                    const cleanLocality = locality.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                    const localitySlug = `lic-agent-in-${cleanLocality}-${cleanCity}`;

                                    const { data: existingLocalityPage } = await supabase
                                        .from('page_index')
                                        .select('id')
                                        .eq('page_slug', localitySlug)
                                        .maybeSingle();

                                    const { data: existingLocalityQueue } = await supabase
                                        .from('generation_queue')
                                        .select('id')
                                        .eq('task_type', 'pagegen')
                                        .in('status', ['pending', 'processing'])
                                        .filter('payload->>created_by', 'eq', 'crm_auto')
                                        .filter('payload->pages->0->>slug', 'eq', localitySlug)
                                        .maybeSingle();

                                    if (!existingLocalityPage && !existingLocalityQueue) {
                                        const { data: qLoc } = await supabase.from('generation_queue').insert({
                                            task_type: 'pagegen',
                                            status: 'pending',
                                            progress: 0,
                                            total_items: 1,
                                            payload: {
                                                version: 1,
                                                priority: 2,
                                                created_by: 'crm_auto',
                                                pages: [{
                                                    slug: localitySlug,
                                                    city_name: city.trim(),
                                                    keyword_text: `LIC Bima Sakhi Career Agency opportunity in ${locality.trim()} ${city.trim()}`,
                                                    city_id: targetCityId,
                                                    page_type: 'locality_page',
                                                    content_level: 'locality'
                                                }]
                                            }
                                        }).select('id').single();

                                        if (qLoc?.id) queueIdsToDispatch.push(qLoc.id);

                                        console.log(`[Pipeline] Queued locality page: ${localitySlug}`);
                                    }
                                }

                                if (queueIdsToDispatch.length > 0) {
                                    // STEP 1 GUARD: Do NOT dispatch to QStash if queue is paused
                                    const pipelineConfig = await getSystemConfig();
                                    if (pipelineConfig.queue_paused) {
                                        console.log('[Pipeline] Queue paused — skipping QStash dispatch for', queueIdsToDispatch.length, 'job(s). Jobs remain pending in DB.');
                                        await safeLog('GUARD_BLOCKED', 'Queue paused — pagegen dispatch skipped by CRM guard', { queueIds: queueIdsToDispatch });
                                    } else {
                                        for (const qId of queueIdsToDispatch) {
                                            enqueuePageGeneration({ queueId: qId }).catch((e) => console.error("Auto trigger error:", e));
                                        }
                                    }
                                }
                            }
                        } catch (pipelineErr) {
                            console.error('Pipeline Connection Error:', pipelineErr);
                            // Non-blocking — lead is already saved, pipeline failure doesn't affect lead
                        }
                    }

                } catch (insertError) {
                    // HANDLE UNIQUE CONSTRAINT RACE CONDITION
                    if (insertError.code === '23505') { // Unique Violation
                        console.warn("Race Condition Detected: Duplicate Insert Attempt");

                        // Fetch the existing record that caused the conflict
                        const { data: raceLead } = await selectLeadByMobileCompat(supabase, normalizedMobile);

                        if (raceLead) {
                            isDuplicate = true;
                            existingLeadData = raceLead;

                            const { error: raceLogErr } = await supabase.from('lead_events').insert({
                                lead_id: raceLead.id,
                                event_type: 'duplicate_race_condition'
                            });
                            if (raceLogErr) console.error("Race Condition Log Error:", raceLogErr);
                        }
                    } else {
                        // Real Error -> Re-throw to fall back to Zoho
                        throw insertError;
                    }
                }
            }

        } catch (sbError) {
            // ENSURE SAFE FALLBACK
            console.error("Supabase Critical Failure (Falling back to Zoho-only):", sbError);
            // Verify state is clean for Zoho fallback
            isDuplicate = false;
            supabaseLeadId = null;
        }
    }

    // --- STOP IF DUPLICATE ---
    if (isDuplicate) {
        await redis.del(idempotencyKey).catch(() => { });
        return res.status(200).json({
            success: true,
            duplicate: true,
            lead_id: existingLeadData.ref_id || existingLeadData.id,
            data: existingLeadData,
            message: "Welcome back! We already have your application."
        });
    }

    // ═══ SYSTEM CONTROL GUARD: CRM Auto-Routing ═══
    const sysConfig = await getSystemConfig();
    if (!sysConfig.crm_auto_routing) {
        await logSystemAction('GUARD_BLOCKED', { guard: 'crm_auto_routing', route: '/api/crm/create-lead', lead_id: refId || supabaseLeadId });
        // Lead is saved in Supabase — skip Zoho push
        return res.status(200).json({
            success: true,
            message: 'Lead saved locally. CRM auto-routing disabled.',
            lead_id: refId || supabaseLeadId || 'local-only',
            zoho_id: null,
            status: 'success',
            action: 'local_save',
            duplicate: false
        });
    }

    // --- EVENT BUS PIPELINE (SINGLE SOURCE OF TRUTH) ---
    try {
        if (!supabaseLeadId) {
            throw new Error("DB First Rule Failed: Lead ID missing.");
        }

        // EVENT BUS: Mandatory path. No fallback. If this fails, the request fails.
        const eventResult = await handleEvent('lead_created', {
            leadId: supabaseLeadId,
            session_id,
        }, 'crm_handler');

        if (!eventResult.success) {
            // Event bus rejected — log and fail the request
            const reason = eventResult.reason || 'unknown';
            console.error('[EventBus] lead_created REJECTED:', reason, eventResult.details || '');
            safeLog('EVENT_BUS_REJECTED', 'Lead event rejected by bus', {
                lead_id: refId || supabaseLeadId,
                reason,
                details: eventResult.details,
            });

            // Lead is saved in DB — mark sync_status so admin can re-trigger
            if (supabase) {
                await supabase.from('leads').update({ sync_status: 'bus_rejected' }).eq('id', supabaseLeadId);
            }

            return res.status(200).json({
                success: true,
                message: 'Lead saved. Event bus dispatch pending.',
                lead_id: refId || supabaseLeadId,
                status: 'saved',
                action: 'bus_rejected',
                reason,
                duplicate: false,
            });
        }

        console.log('[EventBus] lead_created dispatched:', eventResult.message_id);
        safeLog('EVENT_BUS_DISPATCH', 'Lead dispatched via event bus', {
            lead_id: refId || supabaseLeadId,
            message_id: eventResult.message_id,
            executive: eventResult.executive,
        });

        return res.status(200).json({
            success: true,
            message: "Lead processed successfully",
            lead_id: refId || supabaseLeadId,
            status: "success",
            action: "event_bus_dispatched",
            duplicate: false
        });

    } catch (error) {
        await redis.del(idempotencyKey).catch(() => { });

        safeLog('QUEUE_ERROR', 'QStash failed', { error: error.message, lead_id: supabaseLeadId });
        
        if (isSupabaseEnabled && supabase && supabaseLeadId) {
            await supabase.from('leads').update({ sync_status: 'failed_queue' }).eq('id', supabaseLeadId);
            await supabase.from('observability_logs').insert({
                level: 'ERROR',
                message: `Lead QStash queue failed: ${error.message}`,
                source: 'api_lead_sync',
                created_at: new Date().toISOString()
            });
        }
        
        return res.status(500).json({
            success: false,
            error: "Queue publish failed"
        });
    }
}

// ============================================================
// ACTION: create-contact
// ============================================================
async function handleCreateContact(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';
    const rateLimitResult = await rateLimit(`apply_contact:${ip}`, 10, 3600); // 10 contacts per hour per IP
    if (!rateLimitResult.success) {
        return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    }

    // --- FAIL-FAST ENV GUARD ---
    if (!process.env.REDIS_URL) {
        console.error('create-contact: Missing REDIS_URL');
        return res.status(500).json({ success: false, error: 'Server Configuration Error' });
    }

    try {

        const {
            name,
            mobile,
            email,
            reason,
            message,
            source,
            pipeline,
            tag
        } = req.body;

        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const normalizedReason = typeof reason === 'string' && reason.trim()
            ? reason.trim()
            : 'Callback Request';

        // 1. Basic Validation
        if (!name || !mobile || !normalizedEmail || !message) {
            return res.status(400).json({
                success: false,
                error: "All fields are required"
            });
        }

        // 1.5. Normalize Mobile (match create-lead pattern)
        const normalizedMobile = normalizeMobile(mobile);

        // 2. Redis Idempotency Lock (5 min)
        const idempotencyKey = `contact_submit:${normalizedMobile}`;
        const locked = await redis.set(idempotencyKey, '1', 'NX', 'EX', 300);

        if (!locked) {
            return res.status(200).json({
                success: true,
                duplicate: true,
                message: "Duplicate contact submission blocked"
            });
        }

        // 3. Duplicate Check (Supabase)
        if (!supabase) {
            console.error('create-contact: Supabase not initialized — skipping DB operations');
        }

        if (supabase) {
            const { data: existing } = await supabase
                .from("contact_inquiries")
                .select("*")
                .or(`email.eq.${normalizedEmail},mobile.eq.${normalizedMobile}`)
                .limit(1);

            if (existing && existing.length > 0) {
                return res.status(200).json({
                    success: true,
                    duplicate: true,
                    contact_id: existing[0].contact_id
                });
            }
        }

        // 4. Generate Contact ID
        const contactId = `CNT-${Date.now()}`;
        let contactInserted = false;

        // 5. Insert into Supabase
        if (supabase) {
            const insertResult = await insertContactInquiryCompat(supabase, {
                contact_id: contactId,
                name,
                mobile: normalizedMobile,
                email: normalizedEmail,
                reason: normalizedReason,
                message,
                source,
                pipeline,
                tag
            });

            contactInserted = insertResult.inserted;

            if (!insertResult.inserted) {
                console.error('create-contact: Supabase Insert Error', insertResult.error);
                await redis.del(idempotencyKey).catch(() => {});
                return res.status(500).json({
                    success: false,
                    error: "Unable to save contact request"
                });
            }
        }

        // 6. Push via Event Bus (Single source of truth)
        let queue_status = 'pending';
        try {
            const eventResult = await handleEvent('contact_created', {
                contactId,
                session_id: req.body.session_id,
            }, 'crm_handler');

            if (eventResult.success && eventResult.action === 'dispatched') {
                queue_status = 'success';
            } else {
                queue_status = 'bus_rejected';
                console.warn('[EventBus] contact_created rejected:', eventResult.reason || eventResult.action);
                if (supabase) {
                    await updateContactSyncStatusCompat(supabase, contactId, 'bus_rejected');
                }
            }
        } catch (error) {
            queue_status = 'failed';
            console.error(`[Contact EventBus Failed] ${contactId} ${error.message}`);
            if (supabase) {
                await updateContactSyncStatusCompat(supabase, contactId, 'failed_queue');
                await supabase.from('observability_logs').insert({
                    level: 'ERROR',
                    message: `Contact event bus failed: ${error.message}`,
                    source: 'api_contact_sync',
                    created_at: new Date().toISOString()
                }).then(() => {}).catch(() => {});
            }
        }

        return res.status(200).json({
            success: true,
            contact_id: contactId,
            queue_status: queue_status
        });

    } catch (error) {

        // Release lock on failure to allow retry
        const rawMobile = req.body?.mobile;
        if (rawMobile) {
            await redis.del(`contact_submit:${normalizeMobile(rawMobile)}`).catch(() => { });
        }

        console.error("Contact API Error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
}

// ============================================================
// ROUTER
// ============================================================
export default withLogger(async function handler(req, res) {
    const { action } = req.query;

    switch (action) {
        case 'create-lead':
            return handleCreateLead(req, res);
        case 'create-contact':
            return handleCreateContact(req, res);
        default:
            return res.status(404).json({ error: `Unknown CRM action: ${action}` });
    }
});
