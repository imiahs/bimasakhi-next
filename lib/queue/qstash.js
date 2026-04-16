import { Client } from '@upstash/qstash';

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
    // PRODUCTION: Use custom domain
    // This MUST be checked FIRST before VERCEL_URL to ensure production uses bimasakhi.com
    if (process.env.NODE_ENV === 'production') {
        return 'https://bimasakhi.com';
    }
    
    // PREVIEW/DEV: Use environment variables
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'http://localhost:3000'; // Fallback
};
