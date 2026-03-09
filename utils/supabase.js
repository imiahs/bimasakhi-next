import { createClient } from '@supabase/supabase-js';
import { metricsBatcher } from '@/lib/telemetry/metricsBatcher';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing in environment variables.');
}

// Connection Pooling / Singleton pattern for serverless logic
let supabaseClient = null;

if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }, // Avoids unnecessary cookie reads in background API workers
    });
}
export const supabase = supabaseClient;

let serviceClient = null;

export const getServiceSupabase = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        throw new Error('Supabase Service Role Key is missing. This is required for Admin operations.');
    }

    if (!serviceClient) {
        serviceClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false },
        });
    }
    return serviceClient;
};

export const executeWithSupabaseLatency = async (queryPromise) => {
    const start = Date.now();
    try {
        const result = await queryPromise;
        const latency = Date.now() - start;
        metricsBatcher.recordSupabaseLatency(latency);
        return result;
    } catch (e) {
        // Even if it failed, we can log the latency (the time until failure)
        const latency = Date.now() - start;
        metricsBatcher.recordSupabaseLatency(latency);
        throw e;
    }
};
