const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envLocal = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';

const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    const match = envLocal.match(new RegExp(`^${key}=['"]?(.*?)['"]?$`, 'm'));
    return match ? match[1].trim() : null;
};

async function applyTargetedMigration() {
    const migrationName = process.argv[2];

    if (!migrationName) {
        throw new Error('Usage: node scripts/applyTargetedMigration.js <migration-file.sql>');
    }

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationName);

    if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration not found: ${migrationName}`);
    }

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in environment.');

    const host = supabaseUrl.replace('https://', 'db.');
    const password = getEnv('Database_Password');
    if (!password) throw new Error('Missing Database_Password in environment.');

    const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log(`Connected to Supabase PostgreSQL Database for ${migrationName}`);

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name TEXT UNIQUE NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
        `);

        const { rows } = await client.query(
            'SELECT id FROM schema_migrations WHERE migration_name = $1',
            [migrationName]
        );

        if (rows.length > 0) {
            console.log(`[SKIPPED] ${migrationName} - Already executed`);
            await client.query(`NOTIFY pgrst, 'reload schema';`);
            console.log('PostgREST schema cache reload requested.');
            return;
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [migrationName]);
        await client.query('COMMIT');

        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log(`[SUCCESS] ${migrationName}`);
        console.log('PostgREST schema cache reload requested.');
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        await client.end();
    }
}

applyTargetedMigration().catch((error) => {
    console.error('[Targeted Migration]', error.message);
    process.exit(1);
});