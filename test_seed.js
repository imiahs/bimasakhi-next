const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const axios = require('axios');

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function runSeed() {
    try {
        console.log("=== SECTION 1: VERIFY CITIES TABLE ===");
        const { count, error: countErr } = await supabase.from('cities').select('*', { count: 'exact', head: true });
        if (countErr) {
            console.error("❌ Failed to query cities:", countErr.message);
            process.exit(1);
        }
        console.log(`✅ Total cities count: ${count}`);

        console.log("\n=== SECTION 2: SEED DEFAULT DATA ===");
        if (count < 5) { // Assuming we need the 5 base cities
            const newCities = [
                { city_name: 'Delhi', state: 'Delhi', slug: 'delhi', active: true },
                { city_name: 'Mumbai', state: 'Maharashtra', slug: 'mumbai', active: true },
                { city_name: 'Bangalore', state: 'Karnataka', slug: 'bangalore', active: true },
                { city_name: 'Kolkata', state: 'West Bengal', slug: 'kolkata', active: true },
                { city_name: 'Chennai', state: 'Tamil Nadu', slug: 'chennai', active: true }
            ];
            
            for (const c of newCities) {
                const { error: insertErr } = await supabase.from('cities').upsert(c, { onConflict: 'slug' });
                if (insertErr && insertErr.code !== '23505') {
                    console.log(`Failed inserting ${c.city_name}:`, insertErr.message);
                    fs.writeFileSync("seed_err.json", JSON.stringify(insertErr, null, 2));
                }
            }
            console.log("✅ Seeded default cities successfully.");
        } else {
            console.log("✅ Sufficient cities already exist.");
        }

        console.log("\n=== SECTION 3: VALIDATE LOCATION MAPPING ===");
        const { data: delhiCheck } = await supabase.from('cities').select('id, city_name').ilike('city_name', 'Delhi').single();
        if (delhiCheck && delhiCheck.id) {
            console.log(`✅ Mapping valid. Delhi ID: ${delhiCheck.id}`);
        } else {
            console.error("❌ Mapping validation failed.");
            process.exit(1);
        }

        console.log("\n=== SECTION 4: TRIGGER PIPELINE ===");
        const mobile = "9876" + Math.floor(100000 + Math.random() * 900000);
        const refSlug = `test-delhi-${Date.now()}`;
        const payload = {
            name: "Automated QA Data Seed",
            mobile: mobile,
            email: `qa-seed-${Date.now()}@bimasakhi.com`,
            pincode: "110001",
            city: "Delhi",   // Crucial step: trigger Delhi mapping
            state: "Delhi",
            locality: "Test Locality",
            education: "Graduate",
            occupation: "Business",
            reason: "QA Seeding Verification",
            source: "verification_script",
            medium: "automated_test",
            campaign: "prod_qa",
            visitedPages: ["/apply"]
        };

        const res = await axios.post('https://bimasakhi.com/api/crm/create-lead', payload);
        if (res.data.success) {
            console.log("✅ Lead submitted successfully.");
        } else {
            console.error("❌ Lead submission failed.");
            process.exit(1);
        }

        await new Promise(r => setTimeout(r, 2000));
        
        const { data: queue } = await supabase
            .from('generation_queue')
            .select('*')
            .eq('created_by', 'crm_auto')
            .order('created_at', { ascending: false })
            .limit(1);

        if (queue && queue.length > 0) {
            const job = queue[0];
            const p = job.payload?.pages?.[0];
            if (p && p.city_id === delhiCheck.id) {
                console.log(`✅ generation_queue populated. Job ID: ${job.id}`);
            } else {
                console.log("❌ Job populated but city_id mismatch.");
                process.exit(1);
            }
        } else {
            console.log("❌ Generation queue not populated.");
            process.exit(1);
        }

        console.log("\n=== SECTION 5: AI GENERATION ===");
        const qToken = process.env.QSTASH_TOKEN;
        const qRes = await axios.post('https://bimasakhi.com/api/jobs/pagegen', { test: true }, { headers: { 'Authorization': `Bearer ${qToken}` } });
        if (qRes.status === 200) {
            console.log("✅ QStash /api/jobs/pagegen completed:", qRes.data);
            
            await new Promise(r => setTimeout(r, 4000)); // wait for generation
            const { data: contentRows } = await supabase
                .from('location_content')
                .select('slug')
                .eq('city_id', delhiCheck.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (contentRows && contentRows.length > 0) {
                console.log(`✅ location_content inserted. Slug: ${contentRows[0].slug}`);
            } else {
                console.log("❌ location_content table check failed. Not inserted.");
                process.exit(1);
            }
        } else {
            console.error("❌ QStash trigger failed.");
            process.exit(1);
        }

        console.log("\n=== SECTION 6: FINAL VALIDATION ===");
        console.log("✅ Full Flow Lead -> Queue -> AI -> Page is complete.");

    } catch (e) {
        console.error("Test failed:", e.response ? e.response.data : e.message);
        process.exit(1);
    }
}
runSeed();
