import { Client } from '@upstash/qstash';
import { getBaseUrl as getConfiguredBaseUrl } from './qstash';

const getQStashToken = () => (process.env.QSTASH_TOKEN || '').replace(/^"(.*)"$/, '$1').trim();
const getInternalAuthToken = () => getQStashToken();

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

async function publishQueueMessage(targetPath, body) {
    const qstashClient = getQStashClient();
    if (!qstashClient) {
        console.warn('QSTASH_TOKEN missing, dry-run mode or skipped queue publish.');
        return null;
    }

    const targetUrl = `${getBaseUrl()}${targetPath}`;
    const response = await qstashClient.publishJSON({
        url: targetUrl,
        body,
        retries: 3,
        headers: {
            Authorization: `Bearer ${getInternalAuthToken()}`
        }
    });

    if (!response?.messageId) {
        throw new Error(`QStash failed to return a valid messageId for ${targetPath}.`);
    }

    return response;
}

export async function enqueueLeadSync(leadId) {
    return publishQueueMessage('/api/workers/lead-sync', { leadId });
}

export async function enqueueContactSync(contactId) {
    return publishQueueMessage('/api/workers/contact-sync', { contactId });
}

export async function enqueuePageGeneration(metadata = {}) {
    return publishQueueMessage('/api/jobs/pagegen', metadata);
}
