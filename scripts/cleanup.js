import { getServiceSupabase } from '../utils/supabaseClientSingleton.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runCleanup() {
    try {
        const supabase = getServiceSupabase();
        
        console.log("Starting DB Cleanup...");
        
        // 1. Delete from location_content where local_opportunity_description has fake "word word"
        const { data: fetchToDel, error: errC } = await supabase
            .from('location_content')
            .select('id, page_index_id')
            .ilike('local_opportunity_description', '%word word word%');

        if (errC) {
            console.error("Error fetching fake content:", errC);
            return;
        }

        console.log(`Found ${fetchToDel ? fetchToDel.length : 0} fake location_content pages.`);

        if (fetchToDel && fetchToDel.length > 0) {
            const idsToDelete = fetchToDel.map(r => r.id);
            const pageIndexIds = fetchToDel.map(r => r.page_index_id);

            const { error: delContentErr } = await supabase
                .from('location_content')
                .delete()
                .in('id', idsToDelete);
            
            if (delContentErr) console.error("Error deleting content:", delContentErr);

            const { error: delIndexErr } = await supabase
                .from('page_index')
                .delete()
                .in('id', pageIndexIds);
                
            if (delIndexErr) console.error("Error deleting indices:", delIndexErr);
            
            console.log(`Successfully deleted ${idsToDelete.length} fake pages.`);
        }

        // 2. Blog posts test
        const { data: blogDel, error: errB } = await supabase
            .from('blog_posts')
            .select('id')
            .ilike('content', '%word word word%');
            
        if (blogDel && blogDel.length > 0) {
             const b_ids = blogDel.map(r => r.id);
             await supabase.from('blog_posts').delete().in('id', b_ids);
             console.log(`Successfully deleted ${b_ids.length} fake blog posts.`);
        }

        console.log("Cleanup complete.");
        process.exit(0);

    } catch (e) {
        console.error("Exception:", e);
        process.exit(1);
    }
}

runCleanup();
