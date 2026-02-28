import { createClient } from "@supabase/supabase-js";
import { getZohoAccessToken, getZohoApiDomain } from './_middleware/zoho.js';
import { redis } from './_middleware/auth.js';

// --- Safe Supabase Initialization (matches create-lead pattern) ---
let supabase = null;
try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    } else {
        console.warn('create-contact: Supabase credentials missing.');
    }
} catch (e) {
    console.error('create-contact: Supabase Init Error:', e);
}

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
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

        // =========================
        // 1️⃣ Basic Validation
        // =========================

        if (!name || !mobile || !email || !reason || !message) {
            return res.status(400).json({
                success: false,
                error: "All fields are required"
            });
        }

        // =========================
        // 1.5️⃣ Redis Idempotency Lock (5 min)
        // =========================

        const idempotencyKey = `contact_submit:${mobile}`;
        const locked = await redis.set(idempotencyKey, '1', 'NX', 'EX', 300);

        if (!locked) {
            return res.status(200).json({
                success: true,
                duplicate: true,
                message: "Duplicate contact submission blocked"
            });
        }

        // =========================
        // 2️⃣ Duplicate Check (Supabase)
        // =========================

        if (!supabase) {
            console.error('create-contact: Supabase not initialized — skipping DB operations');
            // Continue to Zoho + email without Supabase
        }

        if (supabase) {
            const { data: existing } = await supabase
                .from("contact_inquiries")
                .select("*")
                .or(`email.eq.${email},mobile.eq.${mobile}`)
                .limit(1);

            if (existing && existing.length > 0) {
                return res.status(200).json({
                    success: true,
                    duplicate: true,
                    contact_id: existing[0].contact_id
                });
            }
        }

        // =========================
        // 3️⃣ Generate Contact ID
        // =========================

        const contactId = `CNT-${Date.now()}`;

        // =========================
        // 4️⃣ Insert into Supabase
        // =========================

        if (supabase) {
            const { error: insertError } = await supabase
                .from("contact_inquiries")
                .insert([
                    {
                        contact_id: contactId,
                        name,
                        mobile,
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
                // Continue to Zoho + email even if Supabase fails
            }
        }

        // =========================
        // 5️⃣ Push to Zoho CRM (Refresh Token Flow)
        // =========================

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
                        Phone: mobile,
                        Lead_Source: source || "Website",
                        Description: message,
                        Tag: tag || "Contact Inquiry",
                        Lead_Status: "Contacted"
                    }
                ]
            })
        });

        // --- Zoho Response Validation ---
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

        // =========================
        // 6️⃣ Email Auto-Responder
        // =========================

        await fetch("https://api.zeptomail.in/v1.1/email", {
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
        });

        // =========================
        // 7️⃣ Return Response
        // =========================

        return res.status(200).json({
            success: true,
            contact_id: contactId
        });

    } catch (error) {

        // Release lock on failure to allow retry
        const mobile = req.body?.mobile;
        if (mobile) {
            await redis.del(`contact_submit:${mobile}`).catch(() => { });
        }

        console.error("Contact API Error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
}