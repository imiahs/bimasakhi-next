import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { logSystemEvent } from '@/lib/systemLogger.js';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({error: 'Method not allowed'});
    }
    
    try {
        const supabase = getServiceSupabase();
        
        const yesterday = new Date(Date.now() - 24*60*60*1000);
        yesterday.setHours(0,0,0,0);
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // 1. Leads generated yesterday
        const { count: leads_today } = await supabase.from('leads')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', yesterday.toISOString())
            .lt('created_at', today.toISOString());
            
        // 2. Conversions happened yesterday
        const { count: conversions_today } = await supabase.from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('is_converted', true)
            .gte('converted_at', yesterday.toISOString())
            .lt('converted_at', today.toISOString());
            
        // 3. Revenue yesterday (Aggregation)
        const { data: revData } = await supabase.from('leads')
            .select('conversion_value')
            .eq('is_converted', true)
            .gte('converted_at', yesterday.toISOString())
            .lt('converted_at', today.toISOString());
            
        let revenue_today = 0;
        if (revData) {
            revenue_today = revData.reduce((acc, lead) => acc + (lead.conversion_value || 0), 0);
        }
        
        const report = {
            leads_today: leads_today || 0,
            conversions_today: conversions_today || 0,
            revenue_today
        };
        
        // Log explicitly against telemetry logic
        await logSystemEvent('DAILY_REPORT', 'Automated Daily Business Generation Report', report);
        
        return res.status(200).json({ success: true, data: report });
    } catch (e) {
        console.error("Daily report failed", e);
        return res.status(500).json({ error: e.message });
    }
}
