// Phase 6 Migration: Add scheduled_publish_at column + index
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'db.litucwmzwhpqfgyahpcl.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.Database_Password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

async function migrate() {
  const client = await pool.connect();
  console.log('Connected to DB');

  try {
    // 1. Add scheduled_publish_at column
    await client.query(`ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;`);
    console.log('  ✓ Added column: scheduled_publish_at');

    // 2. Create partial index for scheduled publishing lookups
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_drafts_scheduled ON content_drafts(scheduled_publish_at) WHERE scheduled_publish_at IS NOT NULL;`);
    console.log('  ✓ Created index: idx_content_drafts_scheduled');

    // Verify
    console.log('\n--- Verification ---');
    const result = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='content_drafts' AND column_name='scheduled_publish_at';`);
    console.log('  scheduled_publish_at:', result.rows.length > 0 ? '✓ EXISTS' : '✗ MISSING');

  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    client.release();
    await pool.end();
    console.log('\nDone.');
  }
}

migrate();
