import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export async function logSystemEvent(type, message, metadata = {}) {
    try {
        const supabase = getServiceSupabase();
        if (supabase) {
            await supabase.from('observability_logs').insert({
                level: type,
                message: message,
                source: 'system',
                metadata: metadata
            });
        }
    } catch (e) {
        console.error("System log failed:", e);
    }
}
