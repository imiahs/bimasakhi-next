import { Client } from '@upstash/qstash';
import { getBaseUrl as getConfiguredBaseUrl } from './qstash';
import { safeLog } from '@/lib/safeLogger.js';

const getQStashToken = () => (process.env.QSTASH_TOKEN || '').replace(/^"(.*)"$/, '$1').trim();
const getInternalAuthToken = () => getQStashToken();

const getQStashClient = () => {
    const token = getQStashToken();
    if (!token) return null;
    return new Client({ token });
};

const getBaseUrl = () => {
    // PRODUCTION LOCK: Always use canonical domain in production regardless of env vars.
    // This prevents Vercel preview URL drift where VERCEL_URL resolves to a preview domain.
    if (process.env.NODE_ENV === 'production') {
        return 'https://bimasakhi.com';
    }
    const configuredBaseUrl = getConfiguredBaseUrl();
    if (!configuredBaseUrl || configuredBaseUrl === 'http://localhost:3000') {
        return 'https://bimasakhi.com';
    }
    return configuredBaseUrl;
};

async function publishQueueMessage(targetPath, body) {
    const token = getQStashToken();
    
    // HARD FAIL: Do NOT silently skip if token is missing
    if (!token) {
        const errorMsg = 'CRITICAL: QSTASH_TOKEN is missing. Cannot queue message. This is a production failure.';
        console.error('[QSTASH] ' + errorMsg);
        await safeLog('QSTASH_CRITICAL_ERROR', errorMsg, { missingVariable: 'QSTASH_TOKEN' });
        throw new Error(errorMsg);
    }

    const qstashClient = getQStashClient();
    if (!qstashClient) {
        const errorMsg = 'CRITICAL: QStash client instantiation failed even with token present.';
        console.error('[QSTASH] ' + errorMsg);
        await safeLog('QSTASH_CRITICAL_ERROR', errorMsg, { issue: 'client_instantiation' });
        throw new Error(errorMsg);
    }

    const targetUrl = `${getBaseUrl()}${targetPath}`;
    
    // CRITICAL: Log exact target URL to observability for verification
    await safeLog('QSTASH_TARGET_URL', targetUrl, { 
        targetPath, 
        baseUrl: getBaseUrl(),
        tokenLength: token.length 
    });
    
    // DELIVERY LOGGING: Before publish
    console.log('[QSTASH PUBLISH START]', {
        targetPath,
        targetUrl,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 15) + '...',
        timestamp: new Date().toISOString()
    });

    const response = await qstashClient.publishJSON({
        url: targetUrl,
        body,
        retries: 3
        // NOTE: Do NOT add Authorization header. QStash handles signing via upstash-signature header
    });

    // DELIVERY LOGGING: After publish
    await safeLog('QSTASH_DELIVERY', 'Message queued by QStash', {
        targetPath,
        targetUrl,
        messageId: response?.messageId,
        responseKeys: response ? Object.keys(response) : null
    });
    
    console.log('[QSTASH PUBLISH SUCCESS]', {
        targetPath,
        messageId: response?.messageId,
        responseKeys: response ? Object.keys(response) : null,
        timestamp: new Date().toISOString()
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
