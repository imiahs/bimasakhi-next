import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export async function logSystemEvent(type, message, metadata = {}) {
    try {
        const supabase = getServiceSupabase();
        if (supabase) {
            await supabase.from('system_logs').insert({
                type,
                message,
                metadata
            });
        }
    } catch (e) {
        console.error("System log failed:", e);
    }
}
