require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function runCleanup() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    console.log("Starting DB Cleanup...");
    const { data: fetchToDel } = await supabase.from('location_content').select('id, page_index_id').ilike('local_opportunity_description', '%word word word%');
    
    if (fetchToDel && fetchToDel.length > 0) {
        const idsToDelete = fetchToDel.map(r => r.id);
        const pageIndexIds = fetchToDel.map(r => r.page_index_id);
        await supabase.from('location_content').delete().in('id', idsToDelete);
        await supabase.from('page_index').delete().in('id', pageIndexIds);
        console.log(`Deleted ${idsToDelete.length} fake pages.`);
    } else {
        console.log("No fake pages found.");
    }

    const { data: blogDel } = await supabase.from('blog_posts').select('id').ilike('content', '%word word word%');
    if (blogDel && blogDel.length > 0) {
         const b_ids = blogDel.map(r => r.id);
         await supabase.from('blog_posts').delete().in('id', b_ids);
         console.log(`Deleted ${b_ids.length} fake blog posts.`);
    } else {
        console.log("No fake blog posts found.");
    }
}
runCleanup();
