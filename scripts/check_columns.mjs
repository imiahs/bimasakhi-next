import fs from 'fs';
import pg from 'pg';

const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
const pw = lines.find(l => l.startsWith('Database_Password=')).split('=').slice(1).join('=').trim();

const pool = new pg.Pool({
  host: 'db.litucwmzwhpqfgyahpcl.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: pw,
  ssl: { rejectUnauthorized: false },
});

const result = await pool.query(`
  SELECT column_name, data_type, udt_name 
  FROM information_schema.columns 
  WHERE table_name = 'bulk_generation_jobs' 
    AND column_name IN ('locality_ids', 'city_ids', 'pincode_filter')
`);

result.rows.forEach(c => console.log(c.column_name, '→', c.data_type, '(', c.udt_name, ')'));
await pool.end();
