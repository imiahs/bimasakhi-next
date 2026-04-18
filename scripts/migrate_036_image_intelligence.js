// Phase 3 migration: Add image_prompts and featured_image_url to content_drafts
const { Client } = require('pg');

async function run() {
    const client = new Client({
        host: 'db.litucwmzwhpqfgyahpcl.supabase.co',
        port: 5432,
        user: 'postgres',
        password: process.env.Database_Password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('Connected to DB');

    await client.query(`ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS image_prompts JSONB DEFAULT '{}'`);
    console.log('Added image_prompts column');

    await client.query(`ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS featured_image_url TEXT`);
    console.log('Added featured_image_url column');

    // Check schema_migrations columns and register
    const schemaCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='schema_migrations'`);
    const colNames = schemaCols.rows.map(r => r.column_name);
    console.log('schema_migrations columns:', colNames);

    if (colNames.includes('name')) {
        await client.query(`INSERT INTO schema_migrations (id, name, applied_at) VALUES (61, '036_image_intelligence', NOW()) ON CONFLICT (id) DO NOTHING`);
    } else if (colNames.includes('migration_name')) {
        await client.query(`UPDATE schema_migrations SET migration_name = '036_image_intelligence.sql' WHERE id = 61`);
    } else {
        // Just id + applied_at or similar
        await client.query(`INSERT INTO schema_migrations (id, applied_at) VALUES (61, NOW()) ON CONFLICT (id) DO NOTHING`);
    }
    console.log('Registered migration id=61');

    // Verify columns
    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='content_drafts' AND column_name IN ('image_prompts','featured_image_url')`);
    console.log('Verified columns:', cols.rows.map(r => r.column_name));

    const mig = await client.query(`SELECT * FROM schema_migrations WHERE id=61`);
    console.log('Migration record:', mig.rows);

    await client.end();
    console.log('Done');
}

run().catch(e => { console.error(e); process.exit(1); });
