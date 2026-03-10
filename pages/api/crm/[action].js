// api/crm/[action].js
// Consolidated CRM handler: create-lead + create-contact
import axios from 'axios';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { redis } from '../_middleware/auth.js';
import { withLogger } from '../_middleware/logger.js';
import { getZohoAccessToken, getZohoApiDomain } from '../_middleware/zoho.js';
import { getLocalDb } from '@/utils/localDb.js';

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
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        supabase = getServiceSupabase();
    } else {
        if (process.env.SUPABASE_ENABLED === 'true') {
            console.warn("Supabase credentials missing. Supabase will be skipped.");
        }
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

    assertEnv(['REDIS_URL', 'ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN']);

    // --- INPUT VALIDATION & NORMALIZATION ---
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

    if (!name || !normalizedMobile || !city || !occupation || !email || !pincode) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(normalizedMobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number' });
    }

    if (!source) {
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

    const isSupabaseEnabled = process.env.SUPABASE_ENABLED === 'true' && supabase !== null;

    let isDuplicate = false;
    let supabaseLeadId = null;
    let existingLeadData = null;
    let refId = null;

    if (isSupabaseEnabled) {
        try {
            // A. Check for Duplicate (Optimistic Check)
            const { data: existingLead, error: checkError } = await supabase
                .from('leads')
                .select('id, city, created_at, zoho_lead_id, full_name, ref_id')
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
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;

                    supabaseLeadId = newLead.id;

                    // Generate user-friendly Reference ID
                    refId = await generateRefId();

                    // Store refId in leads table
                    const { error: refIdErr } = await supabase.from('leads').update({
                        ref_id: refId
                    }).eq('id', supabaseLeadId);
                    if (refIdErr) console.error("RefId Update Error:", refIdErr);

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

    // --- ZOHO CRM LOGIC ---

    const leadData = {
        Last_Name: name,
        Mobile: normalizedMobile,
        Email: email,
        City: city,
        State: state,
        Zip_Code: pincode,
        Street: locality,
        Designation: occupation,
        Description: `Education: ${education}\nReason: ${reason || ''}\n\nVisited Pages: ${JSON.stringify(visitedPages || [])}\nLead Source Page: ${lead_source_page || 'Unknown'}`,
        Lead_Source: lead_source_type || source || 'Website',
        Lead_Medium: medium || 'Direct',
        Campaign_Source: campaign || 'Bima Sakhi'
    };

    try {
        const accessToken = await getZohoAccessToken();
        const ZOHO_API_DOMAIN = getZohoApiDomain();

        // Upsert Lead
        const crmUrl = `${ZOHO_API_DOMAIN}/crm/v2.1/Leads/upsert`;

        const crmResponse = await axios.post(crmUrl, {
            data: [leadData],
            duplicate_check_fields: ['Mobile'],
            trigger: ['approval', 'workflow', 'blueprint']
        }, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Handle CRM Response
        const result = crmResponse.data.data ? crmResponse.data.data[0] : null;

        if (result && (result.status === 'success' || result.status === 'duplicate')) {
            const zohoId = result.details.id;
            const action = result.action;

            // --- UPDATE SUPABASE BACK-REF (awaited before response) ---
            if (isSupabaseEnabled && supabaseLeadId && zohoId) {
                const { error: updateErr } = await supabase.from('leads').update({
                    zoho_lead_id: zohoId,
                    status: 'contacted',
                    updated_at: new Date()
                }).eq('id', supabaseLeadId);

                if (updateErr) console.error("Back-ref Update Error:", updateErr);

                const { error: syncEventErr } = await supabase.from('lead_events').insert({
                    lead_id: supabaseLeadId,
                    event_type: 'zoho_synced',
                    metadata: { zoho_id: zohoId, action: action }
                });

                if (syncEventErr) console.error("Sync Event Log Error:", syncEventErr);
            }

            return res.status(200).json({
                success: true,
                message: "Lead processed successfully",
                lead_id: refId || supabaseLeadId || zohoId,
                zoho_id: zohoId,
                status: result.status,
                action: action,
                duplicate: false
            });
        } else {
            console.error("Zoho CRM Data Error:", JSON.stringify(crmResponse.data));
            return res.status(400).json({
                success: false,
                error: "CRM Validation Failed",
                details: "CRM validation failed"
            });
        }

    } catch (error) {
        // Allow retry: clear idempotency lock on failure
        await redis.del(idempotencyKey).catch(() => { });
        console.error("System Error in Create-Lead:", error.response ? error.response.data : error.message);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
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

        // 1. Basic Validation
        if (!name || !mobile || !email || !reason || !message) {
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
                .or(`email.eq.${email},mobile.eq.${normalizedMobile}`)
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
                        email,
                        reason,
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

        // 6. Push to Zoho CRM (Refresh Token Flow)
        const accessToken = await getZohoAccessToken();
        const apiDomain = getZohoApiDomain();

        const zohoResponse = await fetch(`${apiDomain}/crm/v2/Leads`, {
            method: "POST",
            headers: {
                "Authorization": `Zoho-oauthtoken ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                data: [
                    {
                        Last_Name: name,
                        Email: email,
                        Phone: normalizedMobile,
                        Lead_Source: source || "Website",
                        Description: message,
                        Tag: tag || "Contact Inquiry",
                        Lead_Status: "Contacted"
                    }
                ]
            })
        });

        // Zoho Response Validation
        if (!zohoResponse.ok) {
            const zohoError = await zohoResponse.text().catch(() => 'Unknown');
            console.error('create-contact: Zoho CRM Sync Failed', {
                status: zohoResponse.status,
                error: zohoError,
                contact_id: contactId
            });
        } else {
            const zohoData = await zohoResponse.json().catch(() => null);
            console.info('create-contact: Zoho CRM Sync Success', {
                contact_id: contactId,
                zoho: zohoData
            });
        }

        // 7. Email Auto-Responder (fire-and-forget — don't block user response)
        fetch("https://api.zeptomail.in/v1.1/email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Zoho-enczapikey ${process.env.ZEPTO_API_KEY}`
            },
            body: JSON.stringify({
                from: {
                    address: "info@bimasakhi.com",
                    name: "Bima Sakhi Team"
                },
                to: [
                    {
                        email_address: {
                            address: email,
                            name: name
                        }
                    }
                ],
                subject: "We Have Received Your Inquiry",
                htmlbody: `
          <h3>Hello ${name},</h3>
          <p>Thank you for contacting Bima Sakhi.</p>
          <p>Your inquiry regarding <strong>${reason}</strong> has been received.</p>
          <p>Our team will review and respond shortly.</p>
          <br/>
          <p>Regards,<br/>Team Bima Sakhi<br/>Empower Your True YOU</p>
        `
            })
        }).catch(err => console.error('ZeptoMail Send Error:', err));

        // 8. Return Response
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
