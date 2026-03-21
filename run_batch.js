const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require("@google/generative-ai");

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function generateAiContent(systemPrompt, userPrompt) {
    if (!process.env.GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY globally');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: systemPrompt });
    try {
        const result = await model.generateContent(userPrompt);
        return result.response.text();
    } catch (e) {
        throw e;
    }
}

async function runBatch() {
    console.log("Checking generation_queue...");
    const { data: queueJob } = await supabase.from('generation_queue')
        .select('*').in('status', ['pending', 'processing']).order('created_at', { ascending: true }).limit(1).single();

    if (!queueJob) {
        console.log("No pending queue job");
        return;
    }

    const pagesToGenerate = queueJob.payload.pages || [];
    const limit = 20; 
    const batchList = pagesToGenerate.slice(queueJob.progress, queueJob.progress + limit);

    if (batchList.length === 0) {
        await supabase.from('generation_queue').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', queueJob.id);
        console.log("Marked completed");
        return;
    }

    let processedCount = 0;
    for (const pageReq of batchList) {
        const { slug, keyword_variation_id, keyword_text, page_type, content_level } = pageReq;
        const city_id = pageReq.city_id || 1; 
        const locality_id = pageReq.locality_id || null;

        const { data: existingPage } = await supabase.from('page_index').select('id').eq('page_slug', slug).single();
        if (existingPage) { processedCount++; continue; }

        console.log(`Generating AI content for slug: ${slug}...`);
        const prompt = `Act as an expert LIC Recruiter. Write a 600-word localized high-converting landing page for keyword "${keyword_text}" targeting "${slug}". Focus on the benefits for women achieving financial independence through LIC. Format as valid JSON exact match: { "hero_headline": "string", "local_opportunity_description": "string", "meta_title": "string", "meta_description": "string", "cta_text": "string" }`;
        let responseText;
        try {
             responseText = await generateAiContent("You are an SEO expert. Output ONLY JSON.", prompt);
        } catch(e) {
             console.error("Gemini Failure:", e);
             continue;
        }

        let aiContent;
        try {
            let clean = responseText.trim();
            if (clean.startsWith('\`\`\`json')) clean = clean.substring(7, clean.length - 3).trim();
            else if (clean.startsWith('\`\`\`')) clean = clean.substring(3, clean.length - 3).trim();
            aiContent = JSON.parse(clean);
        } catch (e) {
            console.warn('AI Parsing failed, skipping.', e);
            continue;
        }

        const contentStr = `${aiContent.hero_headline} ${aiContent.local_opportunity_description}`;
        const contentHash = crypto.createHash('sha256').update(contentStr).digest('hex');

        console.log("Inserting page_index...");
        const { data: newPage, error: pErr } = await supabase.from('page_index').insert({
            page_slug: slug, city_id, locality_id, keyword_variation_id, status: 'pending_index', page_type: page_type || 'locality_page'
        }).select('id').single();

        if (pErr) { console.error("page_index error:", pErr); return; }

        if (newPage) {
            console.log("Inserting content_fingerprints...");
            const { error: fErr } = await supabase.from('content_fingerprints').insert({ page_index_id: newPage.id, content_hash: contentHash });
            if (fErr) { console.error("fingerprint error:", fErr); return; }

            console.log("Inserting location_content...");
            const { error: cErr } = await supabase.from('location_content').insert({
                page_index_id: newPage.id, content_level, city_id, locality_id, keyword_variation: keyword_text,
                hero_headline: aiContent.hero_headline, local_opportunity_description: aiContent.local_opportunity_description,
                faq_data: [{question: 'How to apply?', answer: 'Fill the form above.'}], cta_text: aiContent.cta_text || 'Apply Now', 
                meta_title: aiContent.meta_title, meta_description: aiContent.meta_description,
                word_count: 800
            });
            if (cErr) { console.error("location_content error:", cErr); return; }
        }
        processedCount++;
    }

    const newProgress = queueJob.progress + processedCount;
    await supabase.from('generation_queue').update({ status: newProgress >= pagesToGenerate.length ? 'completed' : 'processing', progress: newProgress }).eq('id', queueJob.id);
    console.log("✅ Batch completed successfully");
}
runBatch();
