/**
 * Migration: 037_super_admin_panel.sql
 * Phase 14: Super Admin Panel — Feature Flags + Workflow Config
 * 
 * Run: node scripts/migrate_037_super_admin_panel.js
 * Requires: Database_Password env var set
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new pg.Client({
    host: 'db.litucwmzwhpqfgyahpcl.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.Database_Password,
    ssl: { rejectUnauthorized: false },
});

async function run() {
    await client.connect();
    console.log('Connected to DB');

    // Read and execute the migration SQL
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '037_super_admin_panel.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => {
            // Remove empty strings and comment-only blocks
            const lines = s.split('\n').filter(l => l.trim() && !l.trim().startsWith('--'));
            return lines.length > 0;
        })
        .map(s => s + ';'); // Re-add semicolons for valid SQL

    for (const stmt of statements) {
        try {
            await client.query(stmt);
            // Log table creation / index creation
            if (stmt.includes('CREATE TABLE')) {
                const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
                console.log(`Created table: ${match ? match[1] : '(unknown)'}`);
            } else if (stmt.includes('CREATE INDEX')) {
                const match = stmt.match(/CREATE INDEX IF NOT EXISTS (\w+)/i);
                console.log(`Created index: ${match ? match[1] : '(unknown)'}`);
            } else if (stmt.includes('INSERT INTO feature_flags')) {
                console.log('Seeded feature_flags');
            } else if (stmt.includes('INSERT INTO workflow_config')) {
                console.log('Seeded workflow_config');
            }
        } catch (e) {
            // ON CONFLICT DO NOTHING will not error, but log other errors
            if (!e.message.includes('already exists') && !e.message.includes('duplicate key')) {
                console.warn('Statement warning:', e.message.substring(0, 100));
            }
        }
    }

    // Register migration
    const nextIdRes = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM schema_migrations');
    const nextId = nextIdRes.rows[0].next_id;

    await client.query(
        `INSERT INTO schema_migrations (id, migration_name, executed_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING`,
        [nextId, '037_super_admin_panel.sql']
    );
    console.log(`Registered migration id=${nextId}`);

    // Verify
    const { rows: ffRows } = await client.query('SELECT COUNT(*) as cnt FROM feature_flags');
    console.log(`Feature flags count: ${ffRows[0].cnt}`);

    const { rows: wcRows } = await client.query('SELECT COUNT(*) as cnt FROM workflow_config');
    console.log(`Workflow config count: ${wcRows[0].cnt}`);

    const { rows: migRow } = await client.query(
        'SELECT id, migration_name, executed_at FROM schema_migrations WHERE migration_name = $1',
        ['037_super_admin_panel.sql']
    );
    console.log('Migration record:', migRow);

    await client.end();
    console.log('Done');
}

run().catch(e => { console.error(e); process.exit(1); });
