const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../pages/api/crm/[action].js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Lead Logic
const leadPattern = /\/\/ --- ZOHO CRM LOGIC ---[\s\S]*?return res\.status\(500\)\.json\(\{\s*success: false,\s*error: "Internal Server Error"\s*\}\);\s*\}\s*\}/;

const leadReplacement = `// --- PHASE 3 ASYNC QUEUE PUBLISHING ---
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
                message: \`Lead QStash queue failed: \${error.message}\`,
                source: 'api_lead_sync',
                created_at: new Date().toISOString()
            });
        }
        
        return res.status(500).json({
            success: false,
            error: "Queue publish failed"
        });
    }
}`;

content = content.replace(leadPattern, leadReplacement);

// Replace Contact Logic
const contactPattern = /\/\/ 6\. Push to Zoho CRM \(Non-blocking — contact is already saved locally\)[\s\S]*?return res\.status\(500\)\.json\(\{\s*success: false,\s*error: "Internal Server Error"\s*\}\);\s*\}\s*\}/;

const contactReplacement = `// 6. Push to QStash Queue (DB First rules applied)
        try {
            const { enqueueContactSync } = require('@/lib/queue/publisher.js');
            await enqueueContactSync(contactId);
        } catch (error) {
            console.error('create-contact: Queue Push failed', error);
            if (supabase) {
                await supabase.from('contact_inquiries').update({ sync_status: 'failed_queue' }).eq('contact_id', contactId);
                await supabase.from('observability_logs').insert({
                    level: 'ERROR',
                    message: \`Contact QStash queue failed: \${error.message}\`,
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
            const { normalizeMobile } = require('@/lib/domain/contacts/index.js');
            await redis.del(\`contact_submit:\${normalizeMobile(rawMobile)}\`).catch(() => { });
        }

        console.error("Contact API Error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
}`;

content = content.replace(contactPattern, contactReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Refactor complete.");
