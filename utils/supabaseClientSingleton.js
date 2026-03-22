import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

let supabaseAnonClient = null;
let supabaseServiceClient = null;

/**
 * Gets the singleton Supabase Anon Client
 */
export const getSupabaseClient = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase URL or Anon Key is missing in environment variables.');
        return null;
    }

    if (!supabaseAnonClient) {
        supabaseAnonClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false }
        });
    }
    return supabaseAnonClient;
};

/**
 * Gets the singleton Supabase Service Role Client
 */
export const getServiceSupabase = () => {
    if (!supabaseUrl || !serviceRoleKey) {
        console.warn('Supabase URL or Service Role Key is missing in environment variables.');
        return null;
    }

    if (!supabaseServiceClient) {
        supabaseServiceClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false }
        });
    }
    return supabaseServiceClient;
};

// Exporting as default for convenience, or specific instances
export const supabase = getSupabaseClient();
