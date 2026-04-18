// Execute content_drafts migration via direct DB connection
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
  
  try {
    // Step 1: Check if table already exists
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'content_drafts'
      ) as exists
    `);
    
    if (checkResult.rows[0].exists) {
      console.log('✅ content_drafts table already exists!');
      const countResult = await client.query('SELECT COUNT(*) as cnt FROM content_drafts');
      console.log('   Rows:', countResult.rows[0].cnt);
      return;
    }

    console.log('Creating content_drafts table...');

    // Step 2: Execute the CREATE TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_drafts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        generation_queue_id UUID REFERENCES generation_queue(id),
        page_index_id UUID REFERENCES page_index(id),
        city_id UUID REFERENCES cities(id),
        locality_id UUID REFERENCES localities(id),
        slug TEXT NOT NULL,
        page_title TEXT,
        meta_title TEXT,
        meta_description TEXT,
        hero_headline TEXT,
        body_content TEXT,
        faq_data JSONB,
        cta_text TEXT,
        word_count INTEGER DEFAULT 0,
        quality_score NUMERIC(3,1),
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft','review','approved','rejected','published','archived')),
        review_notes TEXT,
        reviewer TEXT,
        reviewed_at TIMESTAMPTZ,
        ai_model TEXT,
        generation_time_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        published_at TIMESTAMPTZ
      )
    `);
    console.log('✅ Table created');

    // Step 3: Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_drafts_city ON content_drafts(city_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_drafts_slug ON content_drafts(slug)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_drafts_created ON content_drafts(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_drafts_page_index ON content_drafts(page_index_id)`);
    console.log('✅ Indexes created');

    // Step 4: Enable RLS
    await client.query(`ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY`);
    console.log('✅ RLS enabled');

    // Step 5: Create policy
    await client.query(`
      CREATE POLICY "service_role_full_access_content_drafts" 
      ON content_drafts FOR ALL 
      USING (true) WITH CHECK (true)
    `);
    console.log('✅ RLS policy created');

    // Step 6: Verify via Supabase REST API
    console.log('\n--- Verification ---');
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'content_drafts' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('Columns:', verifyResult.rows.length);
    verifyResult.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type} ${r.is_nullable === 'NO' ? 'NOT NULL' : ''} ${r.column_default ? 'DEFAULT ' + r.column_default.substring(0, 30) : ''}`);
    });

    console.log('\n✅ MIGRATION COMPLETE: content_drafts table created successfully');

  } catch (err) {
    console.error('❌ MIGRATION FAILED:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
