import { createClient } from '@supabase/supabase-js';

async function verify() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            console.log('DB_ERROR: Missing Supabase credentials in env.');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { count: locCount, error: locErr } = await supabase
            .from('location_content')
            .select('*', { count: 'exact', head: true })
            .ilike('local_opportunity_description', '%word word word%');
            
        const { count: blogCount, error: blogErr } = await supabase
            .from('blog_posts')
            .select('*', { count: 'exact', head: true })
            .ilike('content', '%word word word%');
            
        console.log(`REAL_DB_CHECK - FAKE_LOC: ${locCount || 0}`);
        console.log(`REAL_DB_CHECK - FAKE_BLOG: ${blogCount || 0}`);
    } catch (e) {
        console.log('DB_ERROR:', e.message);
    }
}
verify();
