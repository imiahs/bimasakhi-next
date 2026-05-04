import pg from 'pg';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('=');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  })
);

const pool = new pg.Pool({
  host: 'db.litucwmzwhpqfgyahpcl.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: env.Database_Password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

const sql = `
ALTER TABLE bulk_generation_jobs ADD COLUMN IF NOT EXISTS locality_ids JSONB DEFAULT '[]';
ALTER TABLE bulk_generation_jobs ADD COLUMN IF NOT EXISTS pincode_filter TEXT[] DEFAULT '{}';
`;

try {
  await pool.query(sql);
  console.log('OK: locality_ids + pincode_filter columns added to bulk_generation_jobs');
} catch (e) {
  console.log('ERR:', e.message);
} finally {
  await pool.end();
}
