import { createClient } from '@supabase/supabase-js';

async function checkReal() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const qstashToken = process.env.QSTASH_TOKEN ? process.env.QSTASH_TOKEN.replace(/"/g, '') : '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("--- 1. VERIFY INPUT PIPELINE ---");
    
    // Check Leads
    const { data: leads } = await supabase.from('leads').select('id, name, city').order('created_at', { ascending: false }).limit(3);
    console.log("Recent Leads:");
    console.log(leads);

    // Check Queue
    const { data: queue } = await supabase.from('generation_queue').select('*').in('status', ['pending', 'processing']).order('created_at', { ascending: false }).limit(1);

    if (!queue || queue.length === 0) {
        console.log("\nQueue Result: NO_PENDING_QUEUE");
        console.log("Cannot trigger real flow without organic data in generation_queue.");
        return;
    }

    const job = queue[0];
    console.log("\nQueue Result: FOUND_PENDING_JOB (ID:", job.id, ")");
    console.log("Payload Sample:", JSON.stringify(job.payload.pages?.[0] || {}));

    console.log("\n--- 2. TRIGGER REAL FLOW ---");
    const res = await fetch('https://bimasakhi.com/api/jobs/pagegen', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${qstashToken}` }
    });

    const body = await res.text();
    console.log(`API_RESPONSE (${res.status}): ${body}`);

    if (res.status !== 200) {
        console.log("API Trigger Failed. Aborting Verification.");
        return;
    }

    console.log("\n--- 3. VERIFY OUTPUT ---");
    console.log("Waiting for edge processing to commit DB transactions (10s)...");
    await new Promise(r => setTimeout(r, 10000));
    
    const pages = job.payload.pages || [];
    if (pages.length > 0) {
        const slug = pages[0].slug;
        const { data: idx } = await supabase.from('page_index').select('id').eq('page_slug', slug).single();
        if (idx) {
            const { data: generated } = await supabase.from('location_content').select('word_count, local_opportunity_description').eq('page_index_id', idx.id).single();
            if (generated && generated.word_count > 500) {
                console.log("\nFINAL STATUS: SUCCESS");
                console.log(`Generated Words: ${generated.word_count}`);
                console.log(`Snippet: ${generated.local_opportunity_description.substring(0, 100)}...`);
            } else if (generated) {
                console.log("\nFINAL STATUS: PARTIAL");
                console.log(`Generated Words: ${generated.word_count} (Less than 500)`);
            } else {
                console.log("\nFINAL STATUS: FAIL (No location_content created)");
            }
        } else {
            console.log("\nFINAL STATUS: FAIL (page_index not created for slug)");
        }
    } else {
         console.log("\nFINAL STATUS: FAIL (Empty pages array in job payload)");
    }
}
checkReal();
