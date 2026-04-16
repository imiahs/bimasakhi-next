import { createClient } from '@supabase/supabase-js';

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const qstashToken = process.env.QSTASH_TOKEN ? process.env.QSTASH_TOKEN.replace(/"/g, '') : '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const slug = 'fallback-test-' + Date.now();
    console.log("-> Inserting Fallback Payload...");
    const { error: err1 } = await supabase.from('generation_queue').insert({ 
        status: 'pending', progress: 0, priority: 1, created_by: 'system',
        payload: { pages: [{ slug, keyword_text: "Fallback SEO Check", page_type: 'custom', content_level: 'city' }] } 
    });

    if (err1) {
        console.error("Setup Hook Error:", err1.message);
    }

    console.log("-> Triggering Production QStash Edge Node...");
    const res = await fetch('https://bimasakhi.com/api/jobs/pagegen', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${qstashToken}` }
    });

    console.log("HTTP:", res.status, await res.text());

    await new Promise(r => setTimeout(r, 6000));
    
    let dbSuccess = false;
    const { data: idx } = await supabase.from('page_index').select('id, city_id').eq('page_slug', slug).single();
    if (idx) {
        const { data: loc } = await supabase.from('location_content').select('word_count').eq('page_index_id', idx.id).single();
        if (loc && loc.word_count >= 500) dbSuccess = true;
    }

    console.log('\n--- FINAL STATUS RESULT ---');
    console.log({ FALLBACK_WORKING: dbSuccess ? 'YES' : 'NO', CONTENT_INSERTED: dbSuccess ? 'YES' : 'NO' });
}
run();
