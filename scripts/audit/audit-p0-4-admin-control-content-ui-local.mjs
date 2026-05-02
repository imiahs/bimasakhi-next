import {
  addCheck,
  addError,
  adminLoginPayload,
  envPresence,
  fetchWithTimeout,
  finalize,
  getServiceSupabase,
  loadEnv,
  makeResult,
  TEST_PREFIX,
  writeResult,
} from './_auditUtils.mjs';

loadEnv();

const result = makeResult('p0-4-admin-control-content-ui-local');
const supabase = getServiceSupabase();
const baseUrl = 'http://localhost:3000';
const referer = `${baseUrl}/admin`;

let tempPageId = null;
let tempDraftId = null;

function cookieFromSetCookie(setCookie) {
  if (!setCookie) return '';
  return setCookie.split(',').map((part) => part.split(';')[0]).join('; ');
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '');
}

function adminJsonHeaders(cookie, includeJson = true) {
  const headers = {
    Cookie: cookie,
    Origin: baseUrl,
    Referer: referer,
  };

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function adminRequest(path, cookie, options = {}, timeoutMs = 25000) {
  return fetchWithTimeout(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: cookie,
    },
  }, timeoutMs);
}

async function readDraft(id, cookie) {
  return adminRequest(`/api/admin/ccc/drafts/${id}`, cookie, {}, 25000);
}

async function readPage(id, cookie) {
  return adminRequest(`/api/admin/pages/${id}`, cookie, {}, 25000);
}

async function deleteTempPage() {
  if (!tempPageId) return;
  await supabase.from('page_versions').delete().eq('page_id', tempPageId);
  await supabase.from('page_blocks').delete().eq('page_id', tempPageId);
  await supabase.from('custom_pages').delete().eq('id', tempPageId);
}

async function deleteTempDraft() {
  if (!tempDraftId) return;
  await supabase.from('content_version_history').delete().eq('draft_id', tempDraftId);
  await supabase.from('content_drafts').delete().eq('id', tempDraftId);
}

try {
  addCheck(result, 'env_presence_masked', 'INFO', envPresence([
    'ADMIN_PASSWORD',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]));

  const login = await fetchWithTimeout(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: baseUrl,
      Referer: `${baseUrl}/admin/login`,
    },
    body: JSON.stringify(adminLoginPayload()),
  }, 25000);

  const cookie = cookieFromSetCookie(login.headers['set-cookie']);
  addCheck(result, 'local_admin_login', login.ok && cookie ? 'PASS' : 'FAIL', {
    status: login.status,
    ok: login.ok,
    cookie_present: Boolean(cookie),
    body: login.body,
  });

  if (!cookie) {
    throw new Error('Authenticated local admin session could not be established.');
  }

  const pageSurfaces = [
    { path: '/admin/pages', label: 'pages' },
    { path: '/admin/ccc/drafts', label: 'drafts' },
    { path: '/admin/system/observability', label: 'observability' },
  ];

  for (const surface of pageSurfaces) {
    const pageProbe = await adminRequest(surface.path, cookie, {
      headers: { Accept: 'text/html' },
    }, 25000);

    const bodyText = typeof pageProbe.body === 'string' ? pageProbe.body : JSON.stringify(pageProbe.body);
    const titleMatch = bodyText.match(/<title>(.*?)<\/title>/i);
    addCheck(result, `ui_route_${surface.label}_reachable`, pageProbe.ok && bodyText.includes('<!DOCTYPE html') ? 'PASS' : 'FAIL', {
      status: pageProbe.status,
      page_title: titleMatch?.[1] || null,
    });
  }

  const unauthorizedDrafts = await fetchWithTimeout(`${baseUrl}/api/admin/ccc/drafts`, {}, 20000);
  addCheck(result, 'failure_unauthenticated_drafts_blocked', unauthorizedDrafts.status === 401 ? 'PASS' : 'FAIL', {
    status: unauthorizedDrafts.status,
    body: unauthorizedDrafts.body,
  });

  const invalidPagesFilter = await adminRequest('/api/admin/pages?status=invalid', cookie, {}, 20000);
  addCheck(result, 'failure_invalid_pages_filter_rejected', invalidPagesFilter.status === 400 ? 'PASS' : 'FAIL', {
    status: invalidPagesFilter.status,
    body: invalidPagesFilter.body,
  });

  const observability = await adminRequest('/api/admin/observability', cookie, {}, 25000);
  addCheck(result, 'observability_contract', observability.ok
    && typeof observability.body?.snapshot?.jobs_processed !== 'undefined'
    && typeof observability.body?.snapshot?.jobs_failed !== 'undefined'
    && typeof observability.body?.snapshot?.queue_depth !== 'undefined'
    && typeof observability.body?.snapshot?.dead_letters !== 'undefined'
    ? 'PASS'
    : 'FAIL', {
    status: observability.status,
    snapshot: observability.body?.snapshot || null,
    event_bus_count: Array.isArray(observability.body?.event_bus) ? observability.body.event_bus.length : null,
    executives_count: Array.isArray(observability.body?.executives) ? observability.body.executives.length : null,
    stuck_events_count: Array.isArray(observability.body?.stuck_events) ? observability.body.stuck_events.length : null,
  });

  const listPages = await adminRequest('/api/admin/pages?status=all&page=1&limit=5&search=', cookie, {}, 25000);
  addCheck(result, 'pages_list_filter_pagination', listPages.ok
    && Array.isArray(listPages.body?.pages)
    && typeof listPages.body?.total === 'number'
    && typeof listPages.body?.totalPages === 'number'
    ? 'PASS'
    : 'FAIL', {
    status: listPages.status,
    body: listPages.body,
  });

  const pageTitle = `${TEST_PREFIX} P0.4 Page ${Date.now()}`;
  const expectedInitialPageSlug = normalizeSlug(pageTitle);
  const createPage = await adminRequest('/api/admin/pages', cookie, {
    method: 'POST',
    headers: adminJsonHeaders(cookie),
    body: JSON.stringify({ title: pageTitle, is_campaign_page: false, status: 'draft' }),
  }, 25000);
  tempPageId = createPage.body?.page?.id || null;
  addCheck(result, 'pages_create_slug_autogenerate', createPage.ok
    && Boolean(tempPageId)
    && typeof createPage.body?.page?.slug === 'string'
    && createPage.body.page.slug === expectedInitialPageSlug
    ? 'PASS'
    : 'FAIL', {
    status: createPage.status,
    page_id: tempPageId,
    slug: createPage.body?.page?.slug || null,
    body: createPage.body,
  });

  if (tempPageId) {
    const editedPageSlug = `${TEST_PREFIX} page edited ${Date.now()}`;
    const expectedEditedPageSlug = normalizeSlug(editedPageSlug);
    const patchPage = await adminRequest(`/api/admin/pages/${tempPageId}`, cookie, {
      method: 'PATCH',
      headers: adminJsonHeaders(cookie),
      body: JSON.stringify({
        title: `${pageTitle} Edited`,
        slug: editedPageSlug,
        meta_title: `${pageTitle} Meta`,
        status: 'draft',
      }),
    }, 25000);

    addCheck(result, 'pages_patch_slug_editable', patchPage.ok
      && patchPage.body?.page?.slug === expectedEditedPageSlug
      && patchPage.body?.page?.title === `${pageTitle} Edited`
      ? 'PASS'
      : 'FAIL', {
      status: patchPage.status,
      slug: patchPage.body?.page?.slug || null,
      title: patchPage.body?.page?.title || null,
      body: patchPage.body,
    });

    const pageDetail = await readPage(tempPageId, cookie);
    addCheck(result, 'pages_detail_view', pageDetail.ok
      && pageDetail.body?.page?.id === tempPageId
      && Array.isArray(pageDetail.body?.blocks)
      && Array.isArray(pageDetail.body?.versions)
      ? 'PASS'
      : 'FAIL', {
      status: pageDetail.status,
      body: pageDetail.body,
    });

    const bulkArchivePage = await adminRequest('/api/admin/pages', cookie, {
      method: 'POST',
      headers: adminJsonHeaders(cookie),
      body: JSON.stringify({ action: 'bulk_update_status', ids: [tempPageId], status: 'archived' }),
    }, 25000);

    const archivedPage = await readPage(tempPageId, cookie);
    addCheck(result, 'pages_bulk_archive', bulkArchivePage.ok && archivedPage.body?.page?.status === 'archived' ? 'PASS' : 'FAIL', {
      bulk_status: bulkArchivePage.status,
      page_status: archivedPage.body?.page?.status || null,
      bulk_body: bulkArchivePage.body,
    });

    const restorePage = await adminRequest(`/api/admin/pages/${tempPageId}`, cookie, {
      method: 'PATCH',
      headers: adminJsonHeaders(cookie),
      body: JSON.stringify({ status: 'draft' }),
    }, 25000);
    const restoredPage = await readPage(tempPageId, cookie);
    addCheck(result, 'pages_restore_from_archived', restorePage.ok && restoredPage.body?.page?.status === 'draft' ? 'PASS' : 'FAIL', {
      patch_status: restorePage.status,
      page_status: restoredPage.body?.page?.status || null,
      patch_body: restorePage.body,
    });

    const deletePage = await adminRequest(`/api/admin/pages/${tempPageId}`, cookie, {
      method: 'DELETE',
      headers: adminJsonHeaders(cookie, false),
    }, 25000);
    const deletedPage = await readPage(tempPageId, cookie);
    addCheck(result, 'pages_delete_archives_record', deletePage.ok && deletedPage.body?.page?.status === 'archived' ? 'PASS' : 'FAIL', {
      delete_status: deletePage.status,
      page_status: deletedPage.body?.page?.status || null,
      delete_body: deletePage.body,
    });
  }

  const listDrafts = await adminRequest('/api/admin/ccc/drafts?status=all&page=1&limit=5&search=', cookie, {}, 25000);
  addCheck(result, 'drafts_list_filter_pagination', listDrafts.ok
    && Array.isArray(listDrafts.body?.drafts)
    && typeof listDrafts.body?.total === 'number'
    && typeof listDrafts.body?.totalPages === 'number'
    ? 'PASS'
    : 'FAIL', {
    status: listDrafts.status,
    body: listDrafts.body,
  });

  const createDraft = await adminRequest('/api/admin/ccc/drafts', cookie, {
    method: 'POST',
    headers: adminJsonHeaders(cookie),
    body: JSON.stringify({ action: 'create_blank' }),
  }, 25000);
  tempDraftId = createDraft.body?.draft?.id || null;
  addCheck(result, 'drafts_create_blank', createDraft.ok && Boolean(tempDraftId) ? 'PASS' : 'FAIL', {
    status: createDraft.status,
    draft_id: tempDraftId,
    slug: createDraft.body?.draft?.slug || null,
    body: createDraft.body,
  });

  if (tempDraftId) {
    const nextDraftSlug = `${TEST_PREFIX} draft slug ${Date.now()}`;
    const expectedDraftSlug = normalizeSlug(nextDraftSlug);
    const updateDraft = await adminRequest(`/api/admin/ccc/drafts/${tempDraftId}`, cookie, {
      method: 'PATCH',
      headers: adminJsonHeaders(cookie),
      body: JSON.stringify({
        slug: nextDraftSlug,
        page_title: `${TEST_PREFIX} P0.4 Draft`,
        hero_headline: `${TEST_PREFIX} P0.4 Draft Hero`,
        meta_title: `${TEST_PREFIX} P0.4 Draft Meta`,
        body_content: `<p>${TEST_PREFIX} draft body</p>`,
        change_summary: 'P0.4 local audit draft setup',
      }),
    }, 25000);
    const draftDetail = await readDraft(tempDraftId, cookie);
    addCheck(result, 'drafts_slug_editable', updateDraft.ok
      && draftDetail.body?.draft?.slug === expectedDraftSlug
      ? 'PASS'
      : 'FAIL', {
      update_status: updateDraft.status,
      slug: draftDetail.body?.draft?.slug || null,
      body: updateDraft.body,
    });

    const bulkArchiveDraft = await adminRequest('/api/admin/ccc/drafts', cookie, {
      method: 'POST',
      headers: adminJsonHeaders(cookie),
      body: JSON.stringify({ action: 'bulk_update_status', ids: [tempDraftId], status: 'archived' }),
    }, 25000);
    const archivedDraft = await readDraft(tempDraftId, cookie);
    addCheck(result, 'drafts_bulk_archive', bulkArchiveDraft.ok && archivedDraft.body?.draft?.status === 'archived' ? 'PASS' : 'FAIL', {
      bulk_status: bulkArchiveDraft.status,
      draft_status: archivedDraft.body?.draft?.status || null,
      bulk_body: bulkArchiveDraft.body,
    });

    const bulkRestoreDraft = await adminRequest('/api/admin/ccc/drafts', cookie, {
      method: 'POST',
      headers: adminJsonHeaders(cookie),
      body: JSON.stringify({ action: 'bulk_update_status', ids: [tempDraftId], status: 'draft' }),
    }, 25000);
    const restoredDraft = await readDraft(tempDraftId, cookie);
    addCheck(result, 'drafts_bulk_restore', bulkRestoreDraft.ok && restoredDraft.body?.draft?.status === 'draft' ? 'PASS' : 'FAIL', {
      bulk_status: bulkRestoreDraft.status,
      draft_status: restoredDraft.body?.draft?.status || null,
      bulk_body: bulkRestoreDraft.body,
    });

    const singleArchiveDraft = await adminRequest(`/api/admin/ccc/drafts/${tempDraftId}`, cookie, {
      method: 'PATCH',
      headers: adminJsonHeaders(cookie),
      body: JSON.stringify({ action: 'archive' }),
    }, 25000);
    const singleArchivedDraft = await readDraft(tempDraftId, cookie);
    addCheck(result, 'drafts_single_archive', singleArchiveDraft.ok && singleArchivedDraft.body?.draft?.status === 'archived' ? 'PASS' : 'FAIL', {
      patch_status: singleArchiveDraft.status,
      draft_status: singleArchivedDraft.body?.draft?.status || null,
      patch_body: singleArchiveDraft.body,
    });

    const deleteDraft = await adminRequest(`/api/admin/ccc/drafts/${tempDraftId}`, cookie, {
      method: 'DELETE',
      headers: adminJsonHeaders(cookie, false),
    }, 25000);

    const draftGone = await supabase
      .from('content_drafts')
      .select('id')
      .eq('id', tempDraftId)
      .maybeSingle();
    addCheck(result, 'drafts_delete_archived', deleteDraft.ok && !draftGone.data ? 'PASS' : 'FAIL', {
      delete_status: deleteDraft.status,
      remaining_row: Boolean(draftGone.data),
      delete_body: deleteDraft.body,
    });
    tempDraftId = null;
  }

  const loadPaths = [
    '/api/admin/pages?status=all&page=1&limit=5',
    '/api/admin/ccc/drafts?status=all&page=1&limit=5',
    '/api/admin/observability',
    '/admin/pages',
    '/admin/ccc/drafts',
    '/admin/system/observability',
  ];
  const loadResponses = await Promise.all(loadPaths.map((path) => adminRequest(path, cookie, {
    headers: path.startsWith('/admin/') ? { Accept: 'text/html' } : {},
  }, 25000)));
  addCheck(result, 'load_parallel_admin_surfaces', loadResponses.every((response) => response.status === 200) ? 'PASS' : 'FAIL', {
    statuses: loadResponses.map((response, index) => ({ path: loadPaths[index], status: response.status })),
  });
} catch (error) {
  addError(result, 'p0_4_local_audit_unhandled', error);
} finally {
  try {
    await deleteTempDraft();
  } catch (cleanupError) {
    addError(result, 'cleanup_temp_draft_failed', cleanupError);
  }

  try {
    await deleteTempPage();
  } catch (cleanupError) {
    addError(result, 'cleanup_temp_page_failed', cleanupError);
  }

  writeResult(finalize(result));
}