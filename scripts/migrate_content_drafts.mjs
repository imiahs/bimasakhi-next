// Script to create content_drafts table in Supabase
// Migration: 035_content_command_center.sql

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  // Step 1: Check if table already exists
  const { data: check, error: checkErr } = await supabase
    .from('content_drafts')
    .select('id')
    .limit(1);

  if (!checkErr) {
    console.log('✅ TABLE ALREADY EXISTS - no migration needed');
    console.log('Rows found:', check?.length || 0);
    return;
  }

  console.log('Table missing (expected):', checkErr.message);
  console.log('Creating content_drafts table...');

  // Step 2: Try via exec_sql RPC function
  const sql = `
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
    );
    CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status);
    CREATE INDEX IF NOT EXISTS idx_content_drafts_city ON content_drafts(city_id);
    CREATE INDEX IF NOT EXISTS idx_content_drafts_slug ON content_drafts(slug);
    CREATE INDEX IF NOT EXISTS idx_content_drafts_created ON content_drafts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_content_drafts_page_index ON content_drafts(page_index_id);
    ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "service_role_full_access_content_drafts" ON content_drafts FOR ALL USING (true) WITH CHECK (true);
  `;

  // Try exec_sql RPC
  const { error: rpcErr } = await supabase.rpc('exec_sql', { sql_text: sql });

  if (rpcErr) {
    console.log('RPC exec_sql not available:', rpcErr.message);
    console.log('\n⚠️  Cannot create table via API. You need to run this SQL manually in Supabase Dashboard:');
    console.log('   Go to: https://supabase.com/dashboard → SQL Editor');
    console.log('   Paste the SQL from: supabase/migrations/035_content_command_center.sql');
    console.log('\n--- SQL TO EXECUTE ---');
    console.log(sql);
    console.log('--- END SQL ---');
    return;
  }

  console.log('✅ Migration executed successfully via RPC');

  // Step 3: Verify
  const { data: verify, error: verifyErr } = await supabase
    .from('content_drafts')
    .select('id')
    .limit(1);

  if (verifyErr) {
    console.log('❌ VERIFICATION FAILED:', verifyErr.message);
  } else {
    console.log('✅ VERIFIED: content_drafts table exists and is accessible');
  }
}

migrate().catch(e => console.error('FATAL:', e));
