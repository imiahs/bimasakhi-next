const fs = require('fs');
const { Client } = require('pg');

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

async function fixLocationContent() {
    console.log("Fixing location_content schema...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const dbHost = supabaseUrl.replace('https://', 'db.').replace('.supabase.co', '.supabase.co');
    const password = process.env.Database_Password;
    
    const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@${dbHost}:5432/postgres`;

    const client = new Client({ connectionString });
    try {
        await client.connect();
        await client.query(`
            ALTER TABLE location_content ALTER COLUMN content_level SET DEFAULT 'locality_page';
            ALTER TABLE location_content ALTER COLUMN content_level DROP NOT NULL;
        `);
        console.log("✅ Schema for location_content fixed successfully.");
    } catch(e) {
        console.error("❌ Schema fix failed:", e.message);
    } finally {
        await client.end();
    }
}
fixLocationContent();
