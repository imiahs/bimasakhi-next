const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}


const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function runTest() {
    try {
        console.log("0. Checking and seeding cities table...");
        const { data: exist } = await supabase.from('cities').select('*').limit(1);
        if (!exist || exist.length === 0) {
            console.log("Seeding Delhi into cities table...");
            await supabase.from('cities').insert({ city_name: 'Delhi', state: 'Delhi', tier: 'Tier 1' });
        }

        console.log("1. Submitting lead to https://bimasakhi.com/api/crm/create-lead");
        const mobile = "999888" + Math.floor(1000 + Math.random() * 9000);
        const payload = {
            name: "Automated QA Test",
            mobile: mobile,
            email: `qa-test-${Date.now()}@bimasakhi.com`,
            pincode: "110001",
            city: "Delhi",
            state: "Delhi",
            locality: "Connaught Place",
            education: "Graduate",
            occupation: "Business",
            reason: "QA Verification",
            source: "verification_script",
            medium: "automated_test",
            campaign: "prod_qa",
            visitedPages: ["/apply"],
            lead_source_page: "/apply"
        };

        const axios = require('axios');
        const res = await axios.post('https://bimasakhi.com/api/crm/create-lead', payload);
        console.log("Response:", res.data);
        const { lead_id, zoho_id } = res.data;

        if (!res.data.success) {
            console.error("CRM submission failed");
            process.exit(1);
        }
        console.log("✅ API Response indicates success.");
        
        console.log("2. Verifying in DB...");
        const { data: lead, error: dbErr } = await supabase
            .from('leads')
            .select('*')
            .eq('mobile', mobile)
            .single();

        if (dbErr || !lead) {
            console.error("❌ Lead not found in DB or error:", dbErr);
            process.exit(1);
        }
        console.log("✅ Lead found in DB. ID:", lead.id);

        if (lead.zoho_lead_id === zoho_id && zoho_id != null) {
            console.log("✅ Zoho ID mapped correctly:", zoho_id);
        } else {
            console.log("❌ Zoho ID mismatch or missing. Expected:", zoho_id, "Got:", lead.zoho_lead_id);
        }

        console.log("3. Checking Pipeline Queue...");
        await new Promise(r => setTimeout(r, 2000));
        
        const { data: queue, error: qErr } = await supabase
            .from('generation_queue')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (qErr || !queue || queue.length === 0) {
            console.log("❌ Generation Queue fetch error or empty:", qErr);
            process.exit(1);
        }

        const latestJob = queue[0];
        console.log("Latest Queue Job slug:", latestJob.payload?.pages?.[0]?.slug);
        
        const payloadPages = latestJob.payload?.pages || [];
        const hasDelhi = payloadPages.some(p => p.keyword_text && p.keyword_text.includes("Delhi"));
        if (hasDelhi && payloadPages[0]?.city_id) {
            console.log("✅ Pipeline created job and city mapped correctly with city_id:", payloadPages[0].city_id);
        } else {
            console.log("❌ Pipeline city mapping check failed");
            process.exit(1);
        }
        
        console.log("SUCCESS: CRM Flow & Pipeline tests passed.");
    } catch (e) {
        console.error("Test failed:", e.response ? e.response.data : e.message);
        process.exit(1);
    }
}
runTest();
