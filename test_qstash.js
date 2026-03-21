const axios = require('axios');
const fs = require('fs');

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

async function testQStash() {
    console.log("Testing POST /api/jobs/pagegen...");
    const qToken = process.env.QSTASH_TOKEN;
    if (!qToken) {
        console.error("No QSTASH_TOKEN found");
        process.exit(1);
    }

    try {
        const res = await axios.post('https://bimasakhi.com/api/jobs/pagegen', 
            { test: true }, 
            { headers: { 'Authorization': `Bearer ${qToken}` } }
        );
        console.log("Status:", res.status);
        console.log("Response:", res.data);
        if (res.status === 200) {
            console.log("✅ QStash Execution Test Passed.");
        } else {
            console.log("❌ QStash Execution returned non-200. FAILED.");
        }
    } catch (e) {
        console.log("Status:", e.response ? e.response.status : e.message);
        console.log("Response:", e.response ? e.response.data : '');
        console.log("❌ QStash Execution FAILED.");
    }
}
testQStash();
