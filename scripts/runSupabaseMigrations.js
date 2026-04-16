const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const envLocal = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    const match = envLocal.match(new RegExp(`^${key}=['"]?(.*?)['"]?$`, 'm'));
    return match ? match[1].trim() : null;
};

async function runMigrations() {
    // Construct PostgreSQL URI
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in environment.");

    // e.g. https://xyz.supabase.co -> db.xyz.supabase.co
    const host = supabaseUrl.replace('https://', 'db.');
    const password = getEnv('Database_Password');
    if (!password) throw new Error("Missing Database_Password in environment.");

    const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;

    const client = new Client({ connectionString });
    await client.connect();

    console.log("Connected to Supabase PostgreSQL Database");

    try {
        // 1. Ensure migrations tracking table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name TEXT UNIQUE NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
        `);

        // 2. Discover migration files from the canonical Supabase migrations directory only.
        const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
        let allFiles = [];

        if (fs.existsSync(migrationsDir)) {
            const files = fs.readdirSync(migrationsDir)
                .filter(f => f.endsWith('.sql'))
                .map(f => ({ name: f, fullPath: path.join(migrationsDir, f) }));
            allFiles.push(...files);
        }

        // Lexicographic sort keeps timestamped and numbered migrations deterministic.
        allFiles.sort((a, b) => a.name.localeCompare(b.name));

        console.log(`Discovered ${allFiles.length} migration files. Starting execution...`);

        // 3. Execute sequentially
        for (const file of allFiles) {
            const { rows } = await client.query('SELECT id FROM schema_migrations WHERE migration_name = $1', [file.name]);
            if (rows.length > 0) {
                console.log(`[SKIPPED] ${file.name} - Already executed`);
                continue;
            }

            console.log(`[EXECUTING] ${file.name}...`);
            const sql = fs.readFileSync(file.fullPath, 'utf8');

            try {
                // Execute migration
                await client.query("BEGIN");
                await client.query(sql);

                // Record execution
                await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [file.name]);
                await client.query("COMMIT");
                console.log(`[SUCCESS] ${file.name}`);
            } catch (err) {
                await client.query("ROLLBACK");
                console.error(`[ERROR] Migration failed on ${file.name}:`, err.message);
                throw err; // Stop on first error
            }
        }

        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log("All migrations executed successfully.");

    } finally {
        await client.end();
    }
}

runMigrations().catch(console.error);
