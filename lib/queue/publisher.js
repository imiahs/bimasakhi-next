import { Client } from '@upstash/qstash';
import { getBaseUrl as getConfiguredBaseUrl } from './qstash';

const getQStashToken = () => (process.env.QSTASH_TOKEN || '').replace(/^"(.*)"$/, '$1').trim();

const getQStashClient = () => {
    const token = getQStashToken();
    if (!token) return null;
    return new Client({ token });
};

const getBaseUrl = () => {
    const configuredBaseUrl = getConfiguredBaseUrl();
    if (!configuredBaseUrl || configuredBaseUrl === 'http://localhost:3000') {
        return 'https://bimasakhi.com';
    }
    return configuredBaseUrl;
};

export async function enqueueLeadSync(leadId) {
    const qstashClient = getQStashClient();
    if (!qstashClient) {
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
    const qstashClient = getQStashClient();
    if (!qstashClient) {
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
