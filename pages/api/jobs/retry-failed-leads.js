import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getZohoAccessToken, getZohoApiDomain } from '../_middleware/zoho.js';
import { safeLog } from '@/lib/safeLogger.js';
import { rateLimit } from '@/utils/rateLimiter.js';
import axios from 'axios';

export default async function handler(req, res) {
    const requiredEnvs = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'];
    for (const envStr of requiredEnvs) {
        if (!process.env[envStr]) {
            console.error("Missing ENV:", envStr);
            return res.status(500).json({ error: "Server Misconfigured" });
        }
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';
    const rateLimitResult = await rateLimit(`retry_failed_leads:${ip}`, 30, 3600); 
    if (!rateLimitResult.success) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Optional: QStash verification can go here

    const supabase = getServiceSupabase();
    if (!supabase) {
        return res.status(500).json({ error: 'Database connection failed' });
    }

    try {
        // TASK 5: ALERT SYSTEM (LIGHTWEIGHT)
        // Check overall failed leads count
        const { count, error: countErr } = await supabase
            .from('failed_leads')
            .select('*', { count: 'exact', head: true });

        if (!countErr && count > 10) {
            safeLog('ALERT', 'High failed leads spike', { count });
        }

        // TASK 1: AUTO RETRY FAILED LEADS
        // Fetch failed_leads where created_at < NOW() - 1 min and retry_count < 3
        const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
        
        const { data: leadsToRetry, error: fetchErr } = await supabase
            .from('failed_leads')
            .select('*')
            .lt('created_at', oneMinAgo)
            .lt('retry_count', 3)
            .limit(10); // Batch limit for safety

        if (fetchErr) {
            throw fetchErr;
        }

        if (!leadsToRetry || leadsToRetry.length === 0) {
            return res.status(200).json({ success: true, message: 'No leads pending retry', retried: 0 });
        }

        let successCount = 0;
        let failCount = 0;

        for (const record of leadsToRetry) {
            try {
                // Determine raw variables from Payload
                const { name, mobile, email, city, state, pincode, locality, education, occupation, reason, source, medium, campaign, lead_source_page } = record.payload || {};
                let visitedPages = record.payload?.visitedPages;

                // TASK 6: SAFE JSON PARSING GUARD
                try {
                    if (typeof visitedPages === 'string') {
                        visitedPages = JSON.parse(visitedPages);
                    }
                } catch (e) {
                    safeLog('PARSE_ERROR', 'JSON parse failed for visitedPages in retry', { id: record.id });
                    visitedPages = []; // skip safely
                }
                
                // Fallbacks from Task 4 (ensure they exist)
                const safeCity = city || record.city || 'Unknown';
                const safeOccupation = occupation || 'Not Specified';

                const leadData = {
                    Last_Name: record.name || name || 'Unknown',
                    Mobile: record.mobile || mobile,
                    Email: record.email || email,
                    City: safeCity,
                    State: state || '',
                    Zip_Code: pincode || '',
                    Street: locality || '',
                    Designation: safeOccupation,
                    Description: `[RETRY PAYLOAD]\nEducation: ${education||''}\nReason: ${reason||''}\n\nVisited Pages: ${JSON.stringify(visitedPages||[])}\nLead Source Page: ${lead_source_page||'Unknown'}\nUTM Source: ${source||''}\nUTM Medium: ${medium||''}\nUTM Campaign: ${campaign||''}`,
                    Lead_Source: 'Website'
                };

                if (process.env.SYSTEM_MODE === 'dry-run') {
                    safeLog('DRY_RUN', 'Bypassed Zoho POST inside Retry', { payload: leadData });
                    await supabase.from('failed_leads').delete().eq('id', record.id);
                    successCount++;
                    continue;
                }

                const accessToken = await getZohoAccessToken();
                const ZOHO_API_DOMAIN = getZohoApiDomain();

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

                const result = crmResponse.data.data ? crmResponse.data.data[0] : null;

                if (result && (result.status === 'success' || result.status === 'duplicate')) {
                    // Success!
                    await supabase.from('failed_leads').delete().eq('id', record.id);
                    safeLog('RETRY_SUCCESS', 'Successfully retried failed lead', { failed_lead_id: record.id, zoho_id: result.details?.id });
                    successCount++;
                } else {
                    // Failed again
                    await supabase.from('failed_leads').update({
                        retry_count: (record.retry_count || 0) + 1,
                        error: "Retry Validation Failed: " + JSON.stringify(crmResponse.data)
                    }).eq('id', record.id);
                    failCount++;
                }

            } catch (err) {
                // Exception during retry
                await supabase.from('failed_leads').update({
                    retry_count: (record.retry_count || 0) + 1,
                    error: "Retry Exception: " + (err.response ? JSON.stringify(err.response.data) : err.message)
                }).eq('id', record.id);
                failCount++;
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: `Batch complete`, 
            retried: leadsToRetry.length,
            successCount,
            failCount
        });

    } catch (e) {
        console.error("Auto-retry job failed:", e);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
