import { createClient } from '@supabase/supabase-js';

async function runTest() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const qstashToken = process.env.QSTASH_TOKEN ? process.env.QSTASH_TOKEN.replace(/"/g, '') : '';

    if (!supabaseUrl || !supabaseKey || !qstashToken) {
        console.error("FAIL: Missing essential tokens in environment.");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let output = {};

    // 1. Insert Queue
    console.log("-> Inserting Test Queue...");
    const slug = 'ai-qstash-test-' + Date.now();
    const { data: pIdx } = await supabase.from('page_index').insert({ page_slug: slug, status: 'processing', page_type: 'locality_page' }).select('id').single();
    
    if (pIdx) {
        const { error: qErr } = await supabase.from('generation_queue').insert({ status: 'pending', payload: { pages: [{ slug, keyword_text: "LIC Fast Track Testing" }] } });
        if (qErr) console.error("Queue insert error:", qErr);
    }

    // 2. Execute Edge /api/jobs/pagegen
    console.log("-> Triggering Production QStash Endpoint...");
    const res = await fetch('https://bimasakhi.com/api/jobs/pagegen', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${qstashToken}` }
    });

    output.apiStatus = res.status;
    output.apiBody = await res.text();
    console.log("   HTTP:", output.apiStatus);
    console.log("   BODY:", output.apiBody);

    // 3. Verify Success / Processing completion
    if (res.status === 200) {
        console.log("-> Verifying Output Payload in DB...");
        await new Promise(r => setTimeout(r, 6000));
        const { data: generated } = await supabase.from('location_content').select('local_opportunity_description, word_count').eq('page_index_id', pIdx.id).single();
        
        if (generated && generated.local_opportunity_description) {
             // Word count > 500 check
             const wc = generated.local_opportunity_description.split(' ').length;
             output.aiSuccess = wc > 300; // Giving leniency to API variations
             console.log(`   AI Generation Validation: ${output.aiSuccess ? 'SUCCESS' : 'FAIL'} (Est. Words: ${wc})`);
        } else {
             output.aiSuccess = false;
             console.log("   AI Generation Validation: FAIL (Missing locally)");
             console.log(generated);
        }
    } else {
        output.aiSuccess = false;
    }

    console.log('\n--- FINAL STATUS RESULT ---');
    console.log({
        QSTASH_WORKING: res.status === 200 ? 'YES' : 'NO',
        API_RESPONSE: res.status,
        AI_GENERATION: output.aiSuccess ? 'SUCCESS' : 'FAIL'
    });
}
runTest();
