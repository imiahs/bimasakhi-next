import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

let supabase = null;

function getSupabase() {
    if (!supabase) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
            supabase = createClient(supabaseUrl, supabaseKey);
        }
    }
    return supabase;
}

// In-Memory Buffer to prevent log spam
const LOG_BUFFER = [];
const FLUSH_INTERVAL = 10000; // 10 seconds

// Flush logs periodically (only in browser)
if (typeof window !== 'undefined') {
    setInterval(async () => {
        if (LOG_BUFFER.length === 0) return;

        const batch = [...LOG_BUFFER];
        LOG_BUFFER.length = 0;

        if (process.env.NODE_ENV === 'production') {
            const client = getSupabase();
            if (client) {
                const { error } = await client.from('homepage_logs').insert(batch);
                if (error) console.error("Log Flush Failed", error);
            }
        }
    }, FLUSH_INTERVAL);
}

export const logMetric = (type, message, meta = {}) => {
    // 1. Local Dev Logging
    if (process.env.NODE_ENV === 'development') {
        logger.info('Metrics', `[${type}] ${message}`, meta);
        if (typeof window !== 'undefined') {
            const key = `metric_${type}`;
            const current = Number(localStorage.getItem(key) || 0);
            localStorage.setItem(key, current + 1);
        }
    }

    // 2. Buffer for DB (Only Critical or Low Frequency)
    if (type === 'CRITICAL_FAILURE' || type === 'STATIC_FALLBACK') {
        LOG_BUFFER.push({
            event_type: type,
            message,
            meta
        });
    }
};
