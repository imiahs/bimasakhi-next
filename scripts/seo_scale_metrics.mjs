import { createClient } from '@supabase/supabase-js';

async function getSeoMetrics() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Total pages generated
    const { count: totalPages } = await supabase.from('page_index').select('id', { count: 'exact', head: true }).eq('status', 'active');
    
    // Pages generated today
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const { count: todayPages } = await supabase.from('page_index').select('id', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString());
        
    console.log(JSON.stringify({ 
        totalLive: totalPages || 0, 
        dailyGenerated: todayPages || 0
    }));
}
getSeoMetrics();
