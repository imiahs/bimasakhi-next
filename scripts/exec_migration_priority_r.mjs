/**
 * Migration: 20260420_priority_r_schema_fixes.sql
 * Adds: featured_image_alt to content_drafts, draft_id/alt_text/thumbnail_url to media_files
 * Run: node --env-file=.env.local scripts/exec_migration_priority_r.mjs
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

    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260420_priority_r_schema_fixes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => {
            const lines = s.split('\n').filter(l => l.trim() && !l.trim().startsWith('--'));
            return lines.length > 0;
        })
        .map(s => s + ';');

    for (const stmt of statements) {
        try {
            await client.query(stmt);
            const colMatch = stmt.match(/ADD COLUMN IF NOT EXISTS (\w+)/i);
            const idxMatch = stmt.match(/CREATE INDEX IF NOT EXISTS (\w+)/i);
            if (colMatch) console.log(`  ✓ Added column: ${colMatch[1]}`);
            else if (idxMatch) console.log(`  ✓ Created index: ${idxMatch[1]}`);
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log(`  ⊘ Already exists (skipping): ${e.message.substring(0, 80)}`);
            } else {
                console.error(`  ✗ Error: ${e.message}`);
            }
        }
    }

    // Verify
    console.log('\n--- Verification ---');
    for (const [table, col] of [
        ['content_drafts', 'featured_image_alt'],
        ['media_files', 'draft_id'],
        ['media_files', 'alt_text'],
        ['media_files', 'thumbnail_url'],
    ]) {
        const res = await client.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
            [table, col]
        );
        console.log(`  ${table}.${col}: ${res.rows.length > 0 ? '✓ EXISTS' : '✗ MISSING'}`);
    }

    await client.end();
    console.log('\nDone.');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
