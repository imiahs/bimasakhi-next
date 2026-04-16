import { createClient } from '@supabase/supabase-js';
async function verify() {
    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { count: locCount } = await supabase.from('location_content').select('*', { count: 'exact', head: true }).ilike('local_opportunity_description', '%word word word%');
        const { count: blogCount } = await supabase.from('blog_posts').select('*', { count: 'exact', head: true }).ilike('content', '%word word word%');
        console.log(`FAKE_LOC:${locCount || 0}`);
        console.log(`FAKE_BLOG:${blogCount || 0}`);
    } catch (e) {
        console.log('DB_ERROR:', e.message);
    }
}
verify();
