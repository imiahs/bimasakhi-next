import { Client } from '@upstash/qstash';
import { getSiteUrl } from '@/lib/siteUrl';

let qstashClient = null;

export const getQStashClient = () => {
    if (!process.env.QSTASH_TOKEN) {
        console.warn('QSTASH_TOKEN is missing. Serverless Queues are disabled.');
        return null;
    }
    
    if (!qstashClient) {
        qstashClient = new Client({ token: process.env.QSTASH_TOKEN });
    }
    return qstashClient;
};

// Vercel deployment URL logic for callback targets
export const getBaseUrl = () => {
    return getSiteUrl();
};
