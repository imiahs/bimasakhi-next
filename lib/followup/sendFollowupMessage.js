import { safeLog } from '@/lib/safeLogger';

export async function sendFollowupMessage({ leadId, channel, recipient, message, metadata = {} }) {
    const webhookUrl = process.env.FOLLOWUP_WEBHOOK_URL;
    const webhookToken = process.env.FOLLOWUP_WEBHOOK_TOKEN;

    if (!webhookUrl) {
        await safeLog('FOLLOWUP_SKIPPED', 'Follow-up provider not configured', {
            lead_id: leadId,
            channel,
            recipient,
            ...metadata
        });
        throw new Error('Follow-up provider not configured');
    }

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(webhookToken ? { 'Authorization': `Bearer ${webhookToken}` } : {})
        },
        body: JSON.stringify({
            leadId,
            channel,
            recipient,
            message,
            metadata
        })
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Follow-up delivery failed (${response.status})${detail ? `: ${detail}` : ''}`);
    }

    await safeLog('FOLLOWUP_SENT', 'Follow-up delivered successfully', {
        lead_id: leadId,
        channel,
        recipient,
        ...metadata
    });

    try {
        return await response.json();
    } catch {
        return { success: true };
    }
}
