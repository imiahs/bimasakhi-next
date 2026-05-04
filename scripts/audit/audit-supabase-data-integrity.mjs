import { addCheck, addError, envPresence, finalize, getServiceSupabase, loadEnv, makeResult, TEST_PREFIX, writeResult } from './_auditUtils.mjs';

loadEnv();
const result = makeResult('supabase-data-integrity');

try {
  addCheck(result, 'env_presence_masked', 'INFO', envPresence([
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ENABLED',
  ]));

  const supabase = getServiceSupabase();

  const dbProbe = await supabase.from('system_control_config').select('singleton_key').limit(1);
  addCheck(result, 'db_query_system_control_config', dbProbe.error ? 'FAIL' : 'PASS', {
    error: dbProbe.error?.message || null,
    row_count: dbProbe.data?.length || 0,
  });

  const marker = `${TEST_PREFIX}SUPABASE_${Date.now()}`;
  const insertPayload = {
    level: 'INFO',
    source: 'audit_live_validation',
    message: marker,
    metadata: { audit: true, marker },
  };
  const insertRes = await supabase
    .from('observability_logs')
    .insert(insertPayload)
    .select('id, message, source, created_at')
    .single();

  addCheck(result, 'insert_test_observability_log', insertRes.error ? 'FAIL' : 'PASS', {
    error: insertRes.error?.message || null,
    inserted_id: insertRes.data?.id || null,
    marker,
  });

  if (insertRes.data?.id) {
    const verifyRes = await supabase
      .from('observability_logs')
      .select('id, message, source, created_at')
      .eq('id', insertRes.data.id)
      .single();
    addCheck(result, 'verify_inserted_observability_log', verifyRes.error ? 'FAIL' : 'PASS', {
      error: verifyRes.error?.message || null,
      found: Boolean(verifyRes.data),
      message_matches: verifyRes.data?.message === marker,
    });
  }

  const failureSlug = `${TEST_PREFIX}PARTIAL_WRITE_${Date.now()}`.toLowerCase();
  const beforePage = await supabase
    .from('page_index')
    .select('id')
    .eq('page_slug', failureSlug)
    .maybeSingle();

  const pageInsert = await supabase
    .from('page_index')
    .insert({
      page_slug: failureSlug,
      page_type: 'audit_failure_simulation',
      status: 'unpublished',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, page_slug')
    .single();

  let forcedContentFailure = null;
  if (!pageInsert.error) {
    forcedContentFailure = await supabase
      .from('location_content')
      .insert({
        page_index_id: pageInsert.data.id,
        hero_headline: null,
        local_opportunity_description: `${TEST_PREFIX}forced failure should reject null headline`,
      })
      .select('id')
      .single();
  }

  const afterPage = await supabase
    .from('page_index')
    .select('id, page_slug, status')
    .eq('page_slug', failureSlug)
    .maybeSingle();

  addCheck(result, 'rule16_partial_write_simulation', pageInsert.error ? 'FAIL' : 'PASS', {
    before_existing: Boolean(beforePage.data),
    page_inserted: Boolean(pageInsert.data),
    forced_child_insert_failed: Boolean(forcedContentFailure?.error),
    forced_child_error: forcedContentFailure?.error?.message || null,
    orphan_page_remains: Boolean(afterPage.data),
    verdict: afterPage.data && forcedContentFailure?.error
      ? 'PARTIAL_WRITE_CONFIRMED: parent page_index remains after child insert failure'
      : 'NO_PARTIAL_WRITE_OBSERVED_OR_TEST_INCONCLUSIVE',
  });
} catch (error) {
  addError(result, 'supabase_data_integrity_unhandled', error);
}

writeResult(finalize(result));

