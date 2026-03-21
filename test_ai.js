const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function checkAI() {
    console.log("Checking location_content table...");
    try {
        const { data, error } = await supabase
            .from('location_content')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) {
            console.log("❌ Error fetching location_content or empty table:", error);
            process.exit(1);
        }

        const latest = data[0];
        console.log(`Latest Content Slug: ${latest.slug}`);
        const contentStr = latest.page_content || latest.content || "";
        const word_count = contentStr.split(/\s+/).filter(w => w.length > 0).length;
        console.log(`Word Count: ${word_count}`);

        if (word_count > 300) {
            console.log("✅ AI Generation Test Passed (word_count > 300).");
        } else {
            console.log("❌ AI Generation Test Failed (word_count <= 300).");
            process.exit(1);
        }
    } catch (e) {
        console.error("❌ Exception during AI check:", e);
        process.exit(1);
    }
}
checkAI();
