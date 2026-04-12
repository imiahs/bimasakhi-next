import { Client } from '@upstash/qstash';

const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || '',
});

const getBaseUrl = () => {
    // Rely on environment variable or fallback to production domain.
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://bimasakhi.com';
};

export async function enqueueLeadSync(leadId) {
    if (!process.env.QSTASH_TOKEN) {
        console.warn('QSTASH_TOKEN missing, dry-run mode or skipped queue publish.');
        return null;
    }

    const targetUrl = `${getBaseUrl()}/api/workers/lead-sync`;
    
    const response = await qstashClient.publishJSON({
        url: targetUrl,
        body: { leadId },
        retries: 3
    });

    if (!response || !response.messageId) {
        throw new Error("QStash failed to return a valid messageId for lead sync.");
    }
    
    return response;
}

export async function enqueueContactSync(contactId) {
    if (!process.env.QSTASH_TOKEN) {
        console.warn('QSTASH_TOKEN missing, dry-run mode or skipped queue publish.');
        return null;
    }

    const targetUrl = `${getBaseUrl()}/api/workers/contact-sync`;

    const response = await qstashClient.publishJSON({
        url: targetUrl,
        body: { contactId },
        retries: 3
    });

    if (!response || !response.messageId) {
        throw new Error("QStash failed to return a valid messageId for contact sync.");
    }

    return response;
}
