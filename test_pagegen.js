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

async function testInsert() {
    console.log("Simulating AI Content Insertion...");
    const { data: queueJob } = await supabase.from('generation_queue')
        .select('*').in('status', ['pending', 'processing']).order('created_at', { ascending: true }).limit(1).single();

    if (!queueJob) {
        console.log("No pending queue job to test.");
        return;
    }
    console.log("Found Job:", queueJob.id);
    const pagesToGenerate = queueJob.payload.pages || [];
    const pageReq = pagesToGenerate[0];
    if (!pageReq) return;

    const { slug, keyword_variation_id, keyword_text, page_type, content_level, city_id, locality_id } = pageReq;
    const testSlug = slug + "-" + Date.now();
    // Simulate newPage insert
    const insertPayload = {
        page_slug: testSlug, city_id, locality_id, keyword_variation_id, status: 'pending_index', page_type: page_type || 'locality_page'
    };
    console.log("Inserting into page_index:", insertPayload);
    const { data: newPage, error: err1 } = await supabase.from('page_index').insert(insertPayload).select('id').single();
    if (err1) {
        console.error("❌ page_index insert failed:", err1);
        return;
    }
    console.log("✅ page_index inserted:", newPage.id);

    // Simulate location_content insert
    const locPayload = {
        page_index_id: newPage.id, content_level, city_id, locality_id, keyword_variation: "test",
        hero_headline: "Test headline", local_opportunity_description: "Long text...",
        faq_data: [{question: 'How to apply?', answer: 'Fill the form above.'}], cta_text: 'Apply Now', 
        meta_title: "t", meta_description: "d",
        word_count: 800
    };
    console.log("Inserting into location_content:", locPayload);
    const { data: locRet, error: err2 } = await supabase.from('location_content').insert(locPayload).select('id').single();
    if (err2) {
        console.error("❌ location_content insert failed:", err2);
        return;
    }
    console.log("✅ location_content inserted.");

    const { error: err3 } = await supabase.from('content_fingerprints').insert({ page_index_id: newPage.id, content_hash: "12345" });
    if(err3) {
        console.error("❌ content_fingerprints insert failed:", err3);
    } else {
        console.log("✅ content_fingerprints inserted.");
    }
}
testInsert();
