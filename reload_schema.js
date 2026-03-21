const fs = require('fs');
const { Client } = require('pg');

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

async function reloadCache() {
    console.log("Reloading PostgREST Schema Cache...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const dbHost = supabaseUrl.replace('https://', 'db.').replace('.supabase.co', '.supabase.co');
    const password = process.env.Database_Password;
    
    const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@${dbHost}:5432/postgres`;
    const client = new Client({ connectionString });
    try {
        await client.connect();
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log("✅ Schema cache reloaded successfully.");
    } catch(e) {
        console.error("❌ Schema cache reload failed:", e.message);
    } finally {
        await client.end();
    }
}
reloadCache();
