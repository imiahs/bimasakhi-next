// api/crm/[action].js
// Consolidated CRM handler: create-lead + create-contact
import axios from 'axios';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { redis } from '../_middleware/auth.js';
import { withLogger } from '../_middleware/logger.js';
import { getZohoAccessToken, getZohoApiDomain } from '../_middleware/zoho.js';
import { getLocalDb } from '@/utils/localDb.js';
import { calculateLeadScore } from '@/lib/ai/leadScorer';
import { routeLeadToAgent } from '@/lib/ai/leadRouter';
import { safeLog } from '@/lib/safeLogger.js';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';

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

// Generate user-friendly Reference ID: BS-TU/YYYYMMDD/XXXX
async function generateRefId() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    // Atomic daily counter via Redis
    const counterKey = `ref_id_counter:${dateStr}`;
    const serial = await redis.incr(counterKey);

    // Auto-expire counter key after 48 hours
    if (serial === 1) {
        await redis.expire(counterKey, 172800);
    }

    const serialStr = String(serial).padStart(4, '0');
    return `BS-TU/${dateStr}/${serialStr}`;
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
        source, medium, campaign, visitedPages,
        session_id,
        // Tasks 2 & 3: Lead Attribution
        lead_source_page, lead_source_type
    } = req.body;

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
            const { data: existingLead, error: checkError } = await supabase
                .from('leads')
                .select('id, city, created_at, zoho_lead_id, full_name') // Removed ref_id as it causes 42703 (Missing Column)
                .eq('mobile', normalizedMobile)
                .maybeSingle();

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
                    const { data: newLead, error: insertError } = await supabase
                        .from('leads')
                        .insert({
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
                            medium,
                            campaign,
                            status: 'new'
                            // Removed is_city_missing to prevent PGRST204 (Missing Column) cache failures
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;

                    supabaseLeadId = newLead.id;

                    // Generate user-friendly Reference ID
                    refId = await generateRefId();

                    // Store refId in leads table (Non-Blocking / Graceful degradation)
                    const { error: refIdErr } = await supabase.from('leads').update({
                        ref_id: refId
                    }).eq('id', supabaseLeadId);
                    if (refIdErr) console.warn("Graceful DB Skip: 'ref_id' column missing in schema, continuing with generator...", refIdErr.message);

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

                    // Phase 19: Lead Intelligence & Scoring System
                    if (session_id) {
                        if (isSupabaseEnabled && supabase) {
                            // 1. Fetch Journey Events from Supabase
                            const { data: eventsData, error: eventErr } = await supabase
                                .from('event_stream')
                                .select('event_type, route_path, metadata, created_at')
                                .eq('session_id', session_id)
                                .order('created_at', { ascending: true });

                            const events = eventsData || [];

                            // 2. Compute Score
                            let leadScore = 20; // Base score for form submission
                            let journeySteps = events.map(e => ({
                                action: e.event_type,
                                path: e.route_path,
                                time: e.created_at
                            }));

                            events.forEach(evt => {
                                if (evt.event_type === 'page_view') leadScore += 2;
                                if (evt.event_type === 'calculator_used') leadScore += 10;
                                if (evt.event_type === 'resource_download') leadScore += 5;
                                if (evt.event_type.startsWith('apply_step_')) leadScore += 2;
                            });

                            // 3. Save Score
                            await supabase.from('lead_scores').insert({
                                lead_id: newLead.id,
                                score: leadScore,
                                score_reason: 'Form submission + session engagement'
                            });

                            // 4. Save Journey
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
                                    await supabase.from('generation_queue').insert({
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
                                    });

                                    console.log(`[Pipeline] Queued city page: ${citySlug}`);

                                    // Trigger AI Flow (Non-blocking)
                                    const qToken = process.env.QSTASH_TOKEN
                                        ? process.env.QSTASH_TOKEN.replace(/"/g, '')
                                        : '';

                                    fetch(`https://bimasakhi.com/api/jobs/pagegen`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${qToken}` }
                                    }).catch(e => console.error("Auto trigger error:", e));

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
                                        await supabase.from('generation_queue').insert({
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
                                        });

                                        console.log(`[Pipeline] Queued locality page: ${localitySlug}`);
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
                        const { data: raceLead } = await supabase
                            .from('leads')
                            .select('id, city, created_at')
                            .eq('mobile', normalizedMobile)
                            .maybeSingle();

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

    // --- PHASE 3 ASYNC QUEUE PUBLISHING ---
    const { enqueueLeadSync } = require('@/lib/queue/publisher.js');

    try {
        if (!supabaseLeadId) {
            throw new Error("DB First Rule Failed: Lead ID missing.");
        }

        await enqueueLeadSync(supabaseLeadId);
        
        safeLog('QUEUE_PUBLISH_SUCCESS', 'Lead sync job queued safely', { lead_id: refId || supabaseLeadId });

        return res.status(200).json({
            success: true,
            message: "Lead processed successfully",
            lead_id: refId || supabaseLeadId,
            status: "success",
            action: "async_queued",
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

        // 5. Insert into Supabase
        if (supabase) {
            const { error: insertError } = await supabase
                .from("contact_inquiries")
                .insert([
                    {
                        contact_id: contactId,
                        name,
                        mobile: normalizedMobile,
                        email: normalizedEmail,
                        reason: normalizedReason,
                        message,
                        source,
                        pipeline,
                        tag,
                        created_at: new Date()
                    }
                ]);

            if (insertError) {
                console.error('create-contact: Supabase Insert Error', insertError);
            }
        }

        // 6. Push to QStash Queue (DB First rules applied)
        try {
            const { enqueueContactSync } = require('@/lib/queue/publisher.js');
            await enqueueContactSync(contactId);
        } catch (error) {
            console.error('create-contact: Queue Push failed', error);
            if (supabase) {
                await supabase.from('contact_inquiries').update({ sync_status: 'failed_queue' }).eq('contact_id', contactId);
                await supabase.from('observability_logs').insert({
                    level: 'ERROR',
                    message: `Contact QStash queue failed: ${error.message}`,
                    source: 'api_contact_sync',
                    created_at: new Date().toISOString()
                });
            }
            // Release lock if queue failed so user can try again safely
            await redis.del(idempotencyKey).catch(() => {});
            return res.status(500).json({ success: false, error: "Queue publish failed" });
        }

        return res.status(200).json({
            success: true,
            contact_id: contactId
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
