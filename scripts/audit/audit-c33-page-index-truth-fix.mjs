import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;
const repoRoot = process.cwd();
const envPath = path.join(repoRoot, '.env.local');
const resultsDir = path.join(repoRoot, 'scripts', 'audit', 'results');
const baseUrl = 'https://bimasakhi.com';
const suffix = `${Date.now()}`;

function loadEnv(filePath) {
  const values = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    values[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1');
  }
  return values;
}

const env = loadEnv(envPath);
const db = new Client({
  host: 'db.litucwmzwhpqfgyahpcl.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: env.Database_Password,
  ssl: { rejectUnauthorized: false },
});

const beforeSnapshot = {
  pageIndexStatusCounts: [
    { status: 'active', count: 3 },
    { status: 'archived', count: 3 },
    { status: 'pending_index', count: 7 },
    { status: 'unpublished', count: 1 },
  ],
  pendingVisibleRows: 7,
  activeWithoutContent: 0,
};

const result = {
  name: 'c33-page-index-truth-fix',
  started_at: new Date().toISOString(),
  finished_at: null,
  status: 'PASS',
  checks: [],
  errors: [],
};

const cleanupPageSlugs = new Set();

function addCheck(name, status, evidence) {
  result.checks.push({ name, status, evidence, timestamp: new Date().toISOString() });
  if (status === 'FAIL') result.status = 'FAIL';
}

async function queryOne(sql, params = []) {
  const { rows } = await db.query(sql, params);
  return rows[0] || null;
}

async function queryAll(sql, params = []) {
  const { rows } = await db.query(sql, params);
  return rows;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: response.ok, status: response.status, body, headers: response.headers };
}

function cookieFromSetCookie(setCookie) {
  if (!setCookie) return '';
  return setCookie.split(',').map((part) => part.split(';')[0]).join('; ');
}

async function main() {
  await db.connect();
  try {
    addCheck('env_presence_masked', 'INFO', {
      Database_Password: Boolean(env.Database_Password),
      ADMIN_PASSWORD: Boolean(env.ADMIN_PASSWORD),
    });

    const migration = await queryOne(
      `select migration_name, executed_at
         from public.schema_migrations
        where migration_name = '20260426030500_c33_page_index_truth_fix.sql'`
    );
    addCheck('c33_migration_recorded', migration ? 'PASS' : 'FAIL', migration || {});

    const statusCounts = await queryAll(
      `select status, indexing_status, count(*)::int as count
         from public.page_index
        group by status, indexing_status
        order by status, indexing_status`
    );
    const legacyCount = await queryOne(
      `select count(*)::int as count
         from public.page_index
        where status in ('active', 'pending_index', 'disabled', 'noindex', 'processing')`
    );
    const conflicts = await queryOne(
      `select count(*)::int as count
         from public.page_index
        where (status <> 'published' and indexing_status <> 'blocked')
           or (status = 'published' and indexing_status not in ('pending', 'indexed', 'blocked'))`
    );

    addCheck('c33_before_after_conflict_proof', legacyCount?.count === 0 ? 'PASS' : 'FAIL', {
      before_snapshot: beforeSnapshot,
      after_status_counts: statusCounts,
      legacy_status_rows_after: legacyCount?.count ?? null,
      conflicting_rows_after: conflicts?.count ?? null,
    });

    let rejectedLegacyStatus = null;
    try {
      await db.query(
        `insert into public.page_index (page_slug, page_type, status, indexing_status, created_at, updated_at)
         values ($1, 'locality_page', 'active', 'indexed', now(), now())`,
        [`rule16-c33-invalid-${suffix}`]
      );
    } catch (error) {
      rejectedLegacyStatus = error.message;
    }

    addCheck('db_rejects_legacy_page_status', rejectedLegacyStatus ? 'PASS' : 'FAIL', { error: rejectedLegacyStatus });

    const canonicalSlug = `rule16-c33-canonical-${suffix}`;
    cleanupPageSlugs.add(canonicalSlug);
    const inserted = await queryOne(
      `insert into public.page_index (page_slug, page_type, status, indexing_status, created_at, updated_at)
       values ($1, 'locality_page', 'draft', 'indexed', now(), now())
       returning id, page_slug, status, indexing_status, indexed_at`,
      [canonicalSlug]
    );

    addCheck('db_canonicalizes_invalid_status_combo', inserted?.status === 'draft' && inserted?.indexing_status === 'blocked' && inserted?.indexed_at === null ? 'PASS' : 'FAIL', inserted);

    const draftSlug = `rule16-c33-draft-${suffix}`;
    const publishedSlug = `rule16-c33-published-${suffix}`;
    cleanupPageSlugs.add(draftSlug);
    cleanupPageSlugs.add(publishedSlug);

    const draftPage = await queryOne(
      `insert into public.page_index (page_slug, page_type, status, indexing_status, created_at, updated_at)
       values ($1, 'locality_page', 'draft', 'blocked', now(), now())
       returning id`,
      [draftSlug]
    );
    await db.query(
      `insert into public.location_content (
          page_index_id, content_level, hero_headline, local_opportunity_description,
          meta_title, meta_description, cta_text, faq_data, word_count, created_at, updated_at
       ) values (
          $1, 'locality_page', 'Draft Hero', 'Draft body',
          'Draft Meta', 'Draft Description', 'Draft CTA', '[]'::jsonb, 800, now(), now()
       )`,
      [draftPage.id]
    );

    const publishedPage = await queryOne(
      `insert into public.page_index (page_slug, page_type, status, indexing_status, created_at, updated_at)
       values ($1, 'locality_page', 'published', 'pending', now(), now())
       returning id`,
      [publishedSlug]
    );
    await db.query(
      `insert into public.location_content (
          page_index_id, content_level, hero_headline, local_opportunity_description,
          meta_title, meta_description, cta_text, faq_data, word_count, created_at, updated_at
       ) values (
          $1, 'locality_page', 'Published Hero', 'Published body',
          'Published Meta', 'Published Description', 'Published CTA', '[]'::jsonb, 900, now(), now()
       )`,
      [publishedPage.id]
    );

    const draftLive = await fetch(`${baseUrl}/${draftSlug}`);
    const publishedLive = await fetch(`${baseUrl}/${publishedSlug}`);
    const sitemap = await fetch(`${baseUrl}/sitemaps/sitemap-keywords-latest.xml?c33=${suffix}`);
    const sitemapText = await sitemap.text();

    addCheck('runtime_visibility_matches_canonical_status', draftLive.status === 404 && publishedLive.ok && !sitemapText.includes(draftSlug) && sitemapText.includes(publishedSlug) ? 'PASS' : 'FAIL', {
      draft_status: draftLive.status,
      published_status: publishedLive.status,
      sitemap_contains_draft: sitemapText.includes(draftSlug),
      sitemap_contains_published: sitemapText.includes(publishedSlug),
    });

    const login = await fetchJson(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({ email: 'admin@bimasakhi.com', password: env.ADMIN_PASSWORD }),
    });

    const cookie = cookieFromSetCookie(login.headers.get('set-cookie'));
    addCheck('admin_login_for_c33_metrics', login.ok && cookie ? 'PASS' : 'FAIL', {
      status: login.status,
      ok: login.ok,
      body: login.body,
    });

    const dbMetrics = await queryOne(
      `select
          count(*) filter (where status = 'published')::int as published_pages,
          count(*) filter (where status = 'published' and indexing_status = 'pending')::int as pending_pages,
          count(*) filter (where status = 'published' and indexing_status = 'blocked')::int as blocked_pages
         from public.page_index`
    );

    const apiMetrics = await fetchJson(`${baseUrl}/api/admin/seo/index-health`, {
      headers: { Cookie: cookie },
    });

    const apiBody = apiMetrics.body?.metrics || {};
    const metricsMatch = apiMetrics.ok
      && Number(apiBody.indexed_pages) === Number(dbMetrics.published_pages)
      && Number(apiBody.pending_pages) === Number(dbMetrics.pending_pages)
      && Number(apiBody.noindex_pages) === Number(dbMetrics.blocked_pages);

    addCheck('c33_metrics_consistency', metricsMatch ? 'PASS' : 'FAIL', {
      db_metrics: dbMetrics,
      api_status: apiMetrics.status,
      api_metrics: apiBody,
    });

    const failedChecks = result.checks.filter((check) => check.status === 'FAIL').map((check) => check.name);
    addCheck('c33_page_index_truth_fix_verdict', failedChecks.length === 0 ? 'PASS' : 'FAIL', {
      failed_checks: failedChecks,
      canonical_status_values: ['draft', 'published', 'unpublished', 'archived'],
      canonical_indexing_values: ['blocked', 'pending', 'indexed'],
    });
  } catch (error) {
    result.status = 'FAIL';
    result.errors.push({ message: error.message, stack: error.stack, timestamp: new Date().toISOString() });
    addCheck('c33_unhandled_runtime_error', 'FAIL', { error: error.message });
  } finally {
    if (cleanupPageSlugs.size > 0) {
      await db.query(`delete from public.page_index where page_slug = any($1::text[])`, [[...cleanupPageSlugs]]).catch(() => {});
    }
    await db.end();
    result.finished_at = new Date().toISOString();
    fs.mkdirSync(resultsDir, { recursive: true });
    const filePath = path.join(resultsDir, `${result.finished_at.replace(/[:.]/g, '-')}-c33-page-index-truth-fix.json`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    console.log(`RESULT_FILE=${filePath}`);
    if (result.status !== 'PASS') process.exitCode = 1;
  }
}

main();