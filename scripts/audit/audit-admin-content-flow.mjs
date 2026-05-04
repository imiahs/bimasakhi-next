import { addCheck, addError, adminLoginPayload, canonicalBaseUrl, envPresence, fetchWithTimeout, finalize, getServiceSupabase, loadEnv, makeResult, TEST_PREFIX, writeResult } from './_auditUtils.mjs';

loadEnv();
const result = makeResult('admin-content-flow');

function cookieFromSetCookie(setCookie) {
  if (!setCookie) return '';
  return setCookie.split(',').map((part) => part.split(';')[0]).join('; ');
}

try {
  addCheck(result, 'env_presence_masked', 'INFO', envPresence([
    'ADMIN_PASSWORD',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]));

  const baseUrl = canonicalBaseUrl();
  const supabase = getServiceSupabase();

  const draftSlug = `${TEST_PREFIX}draft-${Date.now()}`.toLowerCase();
  const draftRes = await supabase
    .from('content_drafts')
    .insert({
      slug: draftSlug,
      page_title: `${TEST_PREFIX} Draft Runtime Audit`,
      hero_headline: `${TEST_PREFIX} Draft Runtime Audit`,
      meta_title: `${TEST_PREFIX} Meta Title`,
      meta_description: `${TEST_PREFIX} Meta Description`,
      body_content: `<p>${TEST_PREFIX} body content for live audit.</p>`,
      status: 'draft',
      word_count: 8,
      ai_model: 'audit-script',
    })
    .select('id, slug, status')
    .single();

  addCheck(result, 'draft_insert_direct_db', draftRes.error ? 'FAIL' : 'PASS', {
    error: draftRes.error?.message || null,
    draft_id: draftRes.data?.id || null,
    slug: draftSlug,
  });

  let cookie = '';
  if (process.env.ADMIN_PASSWORD) {
    const login = await fetchWithTimeout(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify(adminLoginPayload()),
    }, 25000);
    cookie = cookieFromSetCookie(login.headers['set-cookie']);
    addCheck(result, 'admin_login_for_content_api', login.ok && cookie ? 'PASS' : 'FAIL', {
      status: login.status,
      ok: login.ok,
      cookie_present: Boolean(cookie),
      body: login.body,
    });
  } else {
    addCheck(result, 'admin_login_for_content_api', 'FAIL', { reason: 'ADMIN_PASSWORD missing' });
  }

  if (draftRes.data?.id && cookie) {
    const getDraft = await fetchWithTimeout(`${baseUrl}/api/admin/ccc/drafts/${draftRes.data.id}`, {
      headers: { Cookie: cookie },
    }, 25000);
    addCheck(result, 'draft_api_read', getDraft.ok ? 'PASS' : 'FAIL', {
      status: getDraft.status,
      ok: getDraft.ok,
      body: getDraft.body,
    });

    const publish = await fetchWithTimeout(`${baseUrl}/api/admin/ccc/drafts/${draftRes.data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: baseUrl },
      body: JSON.stringify({ action: 'approve' }),
    }, 30000);
    addCheck(result, 'publish_api_approve', publish.ok ? 'PASS' : 'FAIL', {
      status: publish.status,
      ok: publish.ok,
      body: publish.body,
    });

    const pageCheck = await supabase
      .from('page_index')
      .select('id, page_slug, status')
      .eq('page_slug', draftSlug)
      .maybeSingle();
    addCheck(result, 'publish_db_page_index_verify', pageCheck.error ? 'FAIL' : 'PASS', {
      error: pageCheck.error?.message || null,
      found: Boolean(pageCheck.data),
      status: pageCheck.data?.status || null,
    });

    if (pageCheck.data?.id) {
      const contentCheck = await supabase
        .from('location_content')
        .select('id, hero_headline, meta_title')
        .eq('page_index_id', pageCheck.data.id)
        .maybeSingle();
      addCheck(result, 'publish_db_location_content_verify', contentCheck.error ? 'FAIL' : 'PASS', {
        error: contentCheck.error?.message || null,
        found: Boolean(contentCheck.data),
        hero_headline: contentCheck.data?.hero_headline || null,
      });

      const livePage = await fetchWithTimeout(`${baseUrl}/${draftSlug}`, {}, 30000);
      addCheck(result, 'published_live_url_render', livePage.ok ? 'PASS' : 'FAIL', {
        status: livePage.status,
        ok: livePage.ok,
        contains_marker: typeof livePage.body === 'string' ? livePage.body.includes(TEST_PREFIX) : false,
        body_sample: typeof livePage.body === 'string' ? livePage.body.slice(0, 300) : livePage.body,
      });
    }
  }
} catch (error) {
  addError(result, 'admin_content_flow_unhandled', error);
}

writeResult(finalize(result));

