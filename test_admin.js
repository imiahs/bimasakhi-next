const axios = require('axios');
const fs = require('fs');

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

async function testAdmin() {
    console.log("Testing Manual Trigger (/api/admin/trigger)...");
    try {
        const res = await axios.post('https://bimasakhi.com/api/admin/trigger', { test_only: true });
        console.log("✅ Trigger API exists. Status:", res.status);
    } catch(e) {
        if (e.response && e.response.status !== 404) {
             console.log("✅ Trigger API exists (returned " + e.response.status + " instead of 404).");
        } else {
             console.log("❌ Trigger API missing or 404", e.response ? e.response.status : '');
        }
    }

    console.log("Testing Queue Control (/api/admin/queue/pause)...");
    try {
        const res = await axios.post('https://bimasakhi.com/api/admin/queue/pause', { paused: false });
         console.log("✅ Queue control API exists. Status:", res.status);
    } catch(e) {
        if (e.response && e.response.status !== 404) {
             console.log("✅ Queue control API exists (returned " + e.response.status + " instead of 404).");
        } else {
             console.log("❌ Queue control API missing or 404", e.response ? e.response.status : '');
        }
    }
}
testAdmin();
