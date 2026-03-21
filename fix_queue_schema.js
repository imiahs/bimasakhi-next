const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

const { Client } = require('pg');

async function fixSchema() {
    console.log("Fixing generation_queue schema...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const host = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    const poolHost = `aws-0-ap-south-1.pooler.supabase.com`; // From .env or known pooler format
    // Let's use the same logic as runSupabaseMigrations
    const dbHost = supabaseUrl.replace('https://', 'db.');
    const password = process.env.Database_Password;
    
    // We try the standard connection string
    const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@${dbHost}:5432/postgres`;

    const client = new Client({ connectionString });
    try {
        await client.connect();
        await client.query(`
            ALTER TABLE generation_queue ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
            ALTER TABLE generation_queue ADD COLUMN IF NOT EXISTS created_by TEXT;
            ALTER TABLE generation_queue ALTER COLUMN task_type SET DEFAULT 'page_generation';
            ALTER TABLE generation_queue ALTER COLUMN task_type DROP NOT NULL;
        `);
        console.log("✅ Schema fixed successfully.");
    } catch(e) {
        console.error("❌ Schema fix failed:", e.message);
    } finally {
        await client.end();
    }
}
fixSchema();
