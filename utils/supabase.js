import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Warn explicitly if variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getServiceSupabase = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        throw new Error('Supabase Service Role Key is missing. This is required for Admin operations.');
    }
    return createClient(supabaseUrl, serviceRoleKey);
};
