import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import { Client as QStashClient } from '@upstash/qstash';

const { Client } = pg;
const repoRoot = process.cwd();
const envPath = path.join(repoRoot, '.env.local');
const resultsDir = path.join(repoRoot, 'scripts', 'audit', 'results');
const baseUrl = 'https://bimasakhi.com';
const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

function loadEnv(filePath) {
  const values = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    values[key] = value.replace(/^"(.*)"$/, '$1');
  }
  return values;
}

const env = loadEnv(envPath);

const dbClient = new Client({
  host: 'db.litucwmzwhpqfgyahpcl.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: env.Database_Password,
  ssl: { rejectUnauthorized: false },
});

const qstash = new QStashClient({ token: env.QSTASH_TOKEN });

const result = {
  name: 'rule16-transactional-integrity',
  started_at: new Date().toISOString(),
  finished_at: null,
  status: 'PASS',
  checks: [],
  errors: [],
};

const cleanup = {
  draftIds: new Set(),
  pageSlugs: new Set(),
  pageIds: new Set(),
  blogIds: new Set(),
  seoPaths: new Set(),
  customPageIds: new Set(),
  toolKeys: new Set(),
  bulkJobIds: new Set(),
  queueIds: new Set(),
  idempotencyKeys: new Set(),
};

function addCheck(name, status, evidence) {
  result.checks.push({
    name,
    status,
    evidence,
    timestamp: new Date().toISOString(),
  });
  if (status === 'FAIL') {
    result.status = 'FAIL';
  }
}

function rememberIdempotencyKey(key) {
  if (key) {
    cleanup.idempotencyKeys.add(key);
  }
  return key;
}

function recordError(error) {
  result.errors.push({ message: error.message, stack: error.stack, timestamp: new Date().toISOString() });
  result.status = 'FAIL';
}

async function queryOne(sql, params = []) {
  const response = await dbClient.query(sql, params);
  return response.rows[0] || null;
}

async function queryAll(sql, params = []) {
  const response = await dbClient.query(sql, params);
  return response.rows;
}

async function callJson(sql, params = []) {
  const row = await queryOne(sql, params);
  return row ? row.result : null;
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: 'follow' });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

async function waitFor(condition, timeoutMs, intervalMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await condition();
    if (value) return value;
    await delay(intervalMs);
  }
  return null;
}

async function getPublishState(slug, draftId) {
  const draft = await queryOne(
    `select id, status, page_index_id, published_at, reviewer
       from public.content_drafts
      where id = $1`,
    [draftId]
  );
  const page = await queryOne(
    `select id, page_slug, status, indexing_status
       from public.page_index
      where page_slug = $1`,
    [slug]
  );
  const content = page
    ? await queryOne(
        `select page_index_id, hero_headline, meta_title
           from public.location_content
          where page_index_id = $1`,
        [page.id]
      )
    : null;

  return { draft, page, content };
}

async function getPagegenPersistState(slug) {
  const page = await queryOne(
    `select id, page_slug, status, indexing_status
       from public.page_index
      where page_slug = $1`,
    [slug]
  );

  const fingerprint = page
    ? await queryOne(
        `select page_index_id, content_hash
           from public.content_fingerprints
          where page_index_id = $1`,
        [page.id]
      )
    : null;

  const content = page
    ? await queryOne(
        `select page_index_id, hero_headline, word_count
           from public.location_content
          where page_index_id = $1`,
        [page.id]
      )
    : null;

  const draft = page
    ? await queryOne(
        `select id, status, quality_score, generation_queue_id
           from public.content_drafts
          where page_index_id = $1
          order by created_at desc
          limit 1`,
        [page.id]
      )
    : null;

  const review = page
    ? await queryOne(
        `select count(*)::int as count
           from public.content_review_queue
          where page_index_id = $1`,
        [page.id]
      )
    : { count: 0 };

  return { page, fingerprint, content, draft, review_count: review?.count || 0 };
}

async function getBulkState(jobId, slug) {
  const job = await queryOne(
    `select id, status, generation_queue_id, total_pages, generated_count
       from public.bulk_generation_jobs
      where id = $1`,
    [jobId]
  );
  const queue = job?.generation_queue_id
    ? await queryOne(
        `select id, status, progress, total_items
           from public.generation_queue
          where id = $1`,
        [job.generation_queue_id]
      )
    : null;
  const event = queue
    ? await queryOne(
        `select id, status, retry_count, dispatch_message_id
           from public.event_store
          where event_name = 'pagegen_requested'
            and payload ->> 'queueId' = $1
          order by created_at desc
          limit 1`,
        [queue.id]
      )
    : null;
  const page = await queryOne(
    `select id, page_slug, status, indexing_status
       from public.page_index
      where page_slug = $1`,
    [slug]
  );
  const draft = page
    ? await queryOne(
        `select id, status
           from public.content_drafts
          where page_index_id = $1
          order by created_at desc
          limit 1`,
        [page.id]
      )
    : null;

  return { job, queue, event, page, draft };
}

async function getCustomPageState(pageId) {
  const page = await queryOne(
    `select id, title, status
       from public.custom_pages
      where id = $1`,
    [pageId]
  );
  const blocks = await queryAll(
    `select block_type, block_order, block_data
       from public.page_blocks
      where page_id = $1
      order by block_order`,
    [pageId]
  );
  const versions = await queryOne(
    `select count(*)::int as count
       from public.page_versions
      where page_id = $1`,
    [pageId]
  );
  return { page, blocks, version_count: versions?.count || 0 };
}

async function getBlogState(postId) {
  const post = await queryOne(
    `select id, slug, title, status
       from public.blog_posts
      where id = $1`,
    [postId]
  );
  const versions = await queryOne(
    `select count(*)::int as count
       from public.blog_post_versions
      where post_id = $1`,
    [postId]
  );
  return { post, version_count: versions?.count || 0 };
}

async function getSeoState(routePath) {
  const override = await queryOne(
    `select id, route_path, meta_title, meta_description
       from public.seo_overrides
      where route_path = $1`,
    [routePath]
  );
  const versions = override
    ? await queryOne(
        `select count(*)::int as count
           from public.seo_versions
          where seo_id = $1`,
        [override.id]
      )
    : { count: 0 };
  return { override, version_count: versions?.count || 0 };
}

async function getToolState(keys) {
  const configs = await queryAll(
    `select config_key, config_value::text as config_value
       from public.tool_configs
      where config_key = any($1::text[])
      order by config_key`,
    [keys]
  );
  const versions = await queryOne(
    `select count(*)::int as count
       from public.tool_config_versions
      where config_key = any($1::text[])`,
    [keys]
  );
  return { configs, version_count: versions?.count || 0 };
}

async function getDraftSyncState(draftId, pageIndexId) {
  const draft = await queryOne(
    `select id, status, hero_headline, meta_title, body_content
       from public.content_drafts
      where id = $1`,
    [draftId]
  );
  const content = await queryOne(
    `select page_index_id, hero_headline, meta_title, local_opportunity_description
       from public.location_content
      where page_index_id = $1`,
    [pageIndexId]
  );
  return { draft, content };
}

async function setPagegenFlags(enabled) {
  await dbClient.query(
    `update public.system_control_config
        set pagegen_enabled = $1,
            bulk_generation_enabled = $1,
            updated_at = now()
      where singleton_key = true`,
    [enabled]
  );
}

async function getOriginalFlags() {
  return queryOne(
    `select pagegen_enabled, bulk_generation_enabled
       from public.system_control_config
      where singleton_key = true`
  );
}

function childProcessCode() {
  return `
const { Client } = require('pg');
const client = new Client({
  host: process.env.RULE16_DB_HOST,
  port: Number(process.env.RULE16_DB_PORT),
  database: process.env.RULE16_DB_NAME,
  user: process.env.RULE16_DB_USER,
  password: process.env.RULE16_DBPW,
  ssl: { rejectUnauthorized: false },
});
(async () => {
  const queryText = process.env.RULE16_QUERY_TEXT;
  const queryArgs = JSON.parse(process.env.RULE16_QUERY_ARGS || '[]');
  await client.connect();
  const queryPromise = client.query(queryText, queryArgs);
  if (process.env.RULE16_DROP_SOCKET === 'true') {
    setTimeout(() => {
      try {
        client.connection.stream.destroy(new Error('rule16_socket_drop'));
      } catch (error) {
        console.error(error.message);
      }
    }, Number(process.env.RULE16_DROP_DELAY_MS || '1500'));
  }
  await queryPromise;
  await client.end();
})().catch(async (error) => {
  console.error(error.message);
  try { await client.end(); } catch {}
  process.exit(1);
});
`;
}

async function waitForChildExit(child, timeoutMs = 8000) {
  return Promise.race([
    new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal, timed_out: false }))),
    delay(timeoutMs).then(() => ({ code: null, signal: null, timed_out: true })),
  ]);
}

function spawnRule16Probe(queryText, queryArgs, extraEnv = {}) {
  return spawn(process.execPath, ['-e', childProcessCode()], {
    env: {
      ...process.env,
      RULE16_DB_HOST: 'db.litucwmzwhpqfgyahpcl.supabase.co',
      RULE16_DB_PORT: '5432',
      RULE16_DB_NAME: 'postgres',
      RULE16_DB_USER: 'postgres',
      RULE16_DBPW: env.Database_Password,
      RULE16_QUERY_TEXT: queryText,
      RULE16_QUERY_ARGS: JSON.stringify(queryArgs),
      ...extraEnv,
    },
    stdio: 'ignore',
  });
}

async function killChildProcess(child) {
  child.kill();
  const exited = await Promise.race([
    new Promise((resolve) => child.once('exit', () => resolve(true))),
    delay(4000).then(() => false),
  ]);

  if (!exited && child.pid) {
    const { execFileSync } = await import('child_process');
    try {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F']);
    } catch {}
  }
}

async function runPublishFailureAndRetry() {
  const slug = `rule16-publish-${suffix}`;
  cleanup.pageSlugs.add(slug);
  const marker = `RULE16_PUBLISH_${suffix}`;

  const draft = await queryOne(
    `insert into public.content_drafts (
        slug, page_title, meta_title, meta_description, hero_headline,
        body_content, faq_data, cta_text, word_count, status,
        created_at, updated_at
     ) values (
        $1, $2, $3, $4, $5,
        $6, '[]'::jsonb, $7, $8, 'draft',
        now(), now()
     ) returning id`,
    [
      slug,
      marker,
      `${marker} title`,
      `${marker} description`,
      marker,
      `${marker} body content`,
      'Apply Now',
      950,
    ]
  );
  cleanup.draftIds.add(draft.id);

  const before = await getPublishState(slug, draft.id);
  let forcedFailure = null;
  try {
    await callJson(
      `select public.rule16_publish_draft($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int) as result`,
      [draft.id, 'rule16_audit', rememberIdempotencyKey(`publish-fail-${slug}`), 'page_index_upserted', null, 0]
    );
  } catch (error) {
    forcedFailure = error.message;
  }

  const afterFailure = await getPublishState(slug, draft.id);
  const retryResult = await callJson(
    `select public.rule16_publish_draft($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int) as result`,
    [draft.id, 'rule16_audit', rememberIdempotencyKey(`publish-success-${slug}`), null, null, 0]
  );
  const afterRetry = await getPublishState(slug, draft.id);
  if (afterRetry.page?.id) cleanup.pageIds.add(afterRetry.page.id);
  const livePage = await fetchText(`${baseUrl}/${slug}`);
  const sitemap = await fetchText(`${baseUrl}/sitemaps/sitemap-keywords-latest.xml?rule16=${suffix}`);

  const passed = Boolean(forcedFailure)
    && !afterFailure.page
    && !afterFailure.content
    && afterFailure.draft?.status === 'draft'
    && afterRetry.page?.status === 'published'
    && afterRetry.page?.indexing_status === 'pending'
    && afterRetry.content
    && afterRetry.draft?.status === 'published'
    && livePage.ok
    && livePage.text.includes(marker)
    && sitemap.text.includes(slug)
    && retryResult?.page_index_id;

  addCheck('publish_force_db_error_then_retry', passed ? 'PASS' : 'FAIL', {
    before,
    forced_failure: forcedFailure,
    after_failure: afterFailure,
    retry_result: retryResult,
    after_retry: afterRetry,
    live_page_status: livePage.status,
    sitemap_contains_slug: sitemap.text.includes(slug),
  });
}

async function runPublishKillProbe() {
  const slug = `rule16-publish-kill-${suffix}`;
  cleanup.pageSlugs.add(slug);
  const draft = await queryOne(
    `insert into public.content_drafts (
        slug, page_title, meta_title, meta_description, hero_headline,
        body_content, faq_data, cta_text, word_count, status,
        created_at, updated_at
     ) values (
        $1, $2, $3, $4, $5,
        $6, '[]'::jsonb, $7, $8, 'draft',
        now(), now()
     ) returning id`,
    [slug, slug, `${slug} title`, `${slug} description`, slug, `${slug} body`, 'Apply', 910]
  );
  cleanup.draftIds.add(draft.id);

  const before = await getPublishState(slug, draft.id);
  const child = spawnRule16Probe(
    'select public.rule16_publish_draft($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int) as result',
    [draft.id, 'rule16_kill_probe', rememberIdempotencyKey(`publish-kill-${slug}`), null, 'page_index_upserted', 30]
  );

  await delay(2000);
  await killChildProcess(child);
  const childExit = await waitForChildExit(child);
  await delay(2000);

  const afterKill = await getPublishState(slug, draft.id);
  const passed = !afterKill.page && !afterKill.content && afterKill.draft?.status === 'draft';

  addCheck('publish_kill_process_mid_execution', passed ? 'PASS' : 'FAIL', {
    before,
    child_exit: childExit,
    after_kill: afterKill,
  });
}

async function runPublishNetworkDropProbe() {
  const slug = `rule16-publish-drop-${suffix}`;
  cleanup.pageSlugs.add(slug);
  const draft = await queryOne(
    `insert into public.content_drafts (
        slug, page_title, meta_title, meta_description, hero_headline,
        body_content, faq_data, cta_text, word_count, status,
        created_at, updated_at
     ) values (
        $1, $2, $3, $4, $5,
        $6, '[]'::jsonb, $7, $8, 'draft',
        now(), now()
     ) returning id`,
    [slug, slug, `${slug} title`, `${slug} description`, slug, `${slug} body`, 'Apply', 920]
  );
  cleanup.draftIds.add(draft.id);

  const before = await getPublishState(slug, draft.id);
  const child = spawnRule16Probe(
    'select public.rule16_publish_draft($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int) as result',
    [draft.id, 'rule16_drop_probe', rememberIdempotencyKey(`publish-drop-${slug}`), null, 'page_index_upserted', 30],
    { RULE16_DROP_SOCKET: 'true', RULE16_DROP_DELAY_MS: '1500' }
  );
  const childExit = await waitForChildExit(child, 12000);
  await delay(2000);

  const afterDrop = await getPublishState(slug, draft.id);
  const passed = !afterDrop.page && !afterDrop.content && afterDrop.draft?.status === 'draft';

  addCheck('publish_network_drop_mid_execution', passed ? 'PASS' : 'FAIL', {
    before,
    child_exit: childExit,
    after_drop: afterDrop,
  });
}

async function runPublishIdempotencyReplay() {
  const slug = `rule16-publish-idempotent-${suffix}`;
  cleanup.pageSlugs.add(slug);
  const marker = `RULE16_PUBLISH_IDEMPOTENT_${suffix}`;
  const draft = await queryOne(
    `insert into public.content_drafts (
        slug, page_title, meta_title, meta_description, hero_headline,
        body_content, faq_data, cta_text, word_count, status,
        created_at, updated_at
     ) values (
        $1, $2, $3, $4, $5,
        $6, '[]'::jsonb, $7, $8, 'draft',
        now(), now()
     ) returning id`,
    [slug, marker, `${marker} title`, `${marker} description`, marker, `${marker} body`, 'Apply', 930]
  );
  cleanup.draftIds.add(draft.id);

  const idempotencyKey = rememberIdempotencyKey(`publish-idempotent-${slug}`);
  const first = await callJson(
    `select public.rule16_publish_draft($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int) as result`,
    [draft.id, 'rule16_audit', idempotencyKey, null, null, 0]
  );
  const second = await callJson(
    `select public.rule16_publish_draft($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int) as result`,
    [draft.id, 'rule16_audit', idempotencyKey, null, null, 0]
  );
  const afterReplay = await getPublishState(slug, draft.id);
  const pageCount = await queryOne(
    `select count(*)::int as count
       from public.page_index
      where page_slug = $1`,
    [slug]
  );

  if (afterReplay.page?.id) cleanup.pageIds.add(afterReplay.page.id);

  const passed = first?.success
    && first?.idempotent_replay === false
    && second?.idempotent_replay === true
    && second?.page_index_id === first?.page_index_id
    && afterReplay.page?.status === 'published'
    && pageCount?.count === 1;

  addCheck('publish_idempotent_replay_same_key', passed ? 'PASS' : 'FAIL', {
    first,
    second,
    after_replay: afterReplay,
    page_count: pageCount?.count || 0,
  });
}

async function runBulkFailureAndRetry() {
  const slug = `rule16-bulk-fail-${suffix}`;
  const job = await queryOne(
    `insert into public.bulk_generation_jobs (
        name, description, intent_type, base_keyword, content_type, status, created_by, created_at, updated_at
     ) values (
        $1, $2, 'locality', $3, 'local_service', 'planned', 'rule16_audit', now(), now()
     ) returning id`,
    [`rule16 bulk fail ${suffix}`, 'rule16 audit bulk failure job', 'bima sakhi opportunity']
  );
  cleanup.bulkJobIds.add(job.id);

  const pages = [
    {
      slug,
      keyword_text: `Bima Sakhi Bulk Fail ${suffix}`,
      page_type: 'locality_page',
      content_level: 'locality_page',
      bulk_job_id: job.id,
    },
  ];

  const before = await getBulkState(job.id, slug);
  let failure = null;
  try {
    await callJson(
      `select public.rule16_start_bulk_generation_job($1::uuid, $2::jsonb, $3::text, $4::text, $5::text, $6::text, $7::int) as result`,
      [job.id, JSON.stringify(pages), 'rule16_audit', rememberIdempotencyKey(`bulk-fail-${suffix}-${job.id}`), 'generation_queue_inserted', null, 0]
    );
  } catch (error) {
    failure = error.message;
  }

  const afterFailure = await getBulkState(job.id, slug);
  const retry = await callJson(
    `select public.rule16_start_bulk_generation_job($1::uuid, $2::jsonb, $3::text, $4::text, $5::text, $6::text, $7::int) as result`,
    [job.id, JSON.stringify(pages), 'rule16_audit', rememberIdempotencyKey(`bulk-success-${suffix}-${job.id}`), null, null, 0]
  );
  const afterRetry = await getBulkState(job.id, slug);

  if (retry?.queue_id) cleanup.queueIds.add(retry.queue_id);

  const passed = Boolean(failure)
    && afterFailure.job?.status === 'planned'
    && !afterFailure.queue
    && !afterFailure.event
    && afterRetry.job?.status === 'running'
    && afterRetry.queue?.status === 'pending'
    && afterRetry.event?.status === 'pending'
    && retry?.queue_id;

  addCheck('bulk_force_db_error_then_retry', passed ? 'PASS' : 'FAIL', {
    before,
    failure,
    after_failure: afterFailure,
    retry,
    after_retry: afterRetry,
  });
}

async function runBulkKillProbe() {
  const slug = `rule16-bulk-kill-${suffix}`;
  const job = await queryOne(
    `insert into public.bulk_generation_jobs (
        name, description, intent_type, base_keyword, content_type, status, created_by, created_at, updated_at
     ) values (
        $1, $2, 'locality', $3, 'local_service', 'planned', 'rule16_audit', now(), now()
     ) returning id`,
    [`rule16 bulk kill ${suffix}`, 'rule16 audit bulk kill job', 'bima sakhi opportunity']
  );
  cleanup.bulkJobIds.add(job.id);

  const pages = [
    {
      slug,
      keyword_text: `Bima Sakhi Bulk Kill ${suffix}`,
      page_type: 'locality_page',
      content_level: 'locality_page',
      bulk_job_id: job.id,
    },
  ];

  const before = await getBulkState(job.id, slug);
  const child = spawnRule16Probe(
    'select public.rule16_start_bulk_generation_job($1::uuid, $2::jsonb, $3::text, $4::text, $5::text, $6::text, $7::int) as result',
    [job.id, JSON.stringify(pages), 'rule16_kill_probe', rememberIdempotencyKey(`bulk-kill-${suffix}-${job.id}`), null, 'bulk_job_updated', 30]
  );

  await delay(2000);
  await killChildProcess(child);
  const childExit = await waitForChildExit(child);
  await delay(2000);

  const afterKill = await getBulkState(job.id, slug);
  const passed = afterKill.job?.status === 'planned' && !afterKill.queue && !afterKill.event;

  addCheck('bulk_kill_process_mid_execution', passed ? 'PASS' : 'FAIL', {
    before,
    child_exit: childExit,
    after_kill: afterKill,
  });
}

async function runBulkIdempotencyReplay() {
  const slug = `rule16-bulk-idempotent-${suffix}`;
  const job = await queryOne(
    `insert into public.bulk_generation_jobs (
        name, description, intent_type, base_keyword, content_type, status, created_by, created_at, updated_at
     ) values (
        $1, $2, 'locality', $3, 'local_service', 'planned', 'rule16_audit', now(), now()
     ) returning id`,
    [`rule16 bulk idempotent ${suffix}`, 'rule16 audit bulk idempotent job', 'bima sakhi opportunity']
  );
  cleanup.bulkJobIds.add(job.id);

  const pages = [
    {
      slug,
      keyword_text: `Bima Sakhi Bulk Idempotent ${suffix}`,
      page_type: 'locality_page',
      content_level: 'locality_page',
      bulk_job_id: job.id,
    },
  ];
  const idempotencyKey = rememberIdempotencyKey(`bulk-idempotent-${suffix}-${job.id}`);
  const first = await callJson(
    `select public.rule16_start_bulk_generation_job($1::uuid, $2::jsonb, $3::text, $4::text, $5::text, $6::text, $7::int) as result`,
    [job.id, JSON.stringify(pages), 'rule16_audit', idempotencyKey, null, null, 0]
  );
  const second = await callJson(
    `select public.rule16_start_bulk_generation_job($1::uuid, $2::jsonb, $3::text, $4::text, $5::text, $6::text, $7::int) as result`,
    [job.id, JSON.stringify(pages), 'rule16_audit', idempotencyKey, null, null, 0]
  );
  const afterReplay = await getBulkState(job.id, slug);
  const queueCount = await queryOne(
    `select count(*)::int as count
       from public.generation_queue
      where id = $1`,
    [first?.queue_id]
  );
  const eventCount = await queryOne(
    `select count(*)::int as count
       from public.event_store
      where event_name = 'pagegen_requested'
        and payload ->> 'queueId' = $1`,
    [first?.queue_id]
  );

  if (first?.queue_id) cleanup.queueIds.add(first.queue_id);

  const passed = first?.success
    && first?.idempotent_replay === false
    && second?.idempotent_replay === true
    && second?.queue_id === first?.queue_id
    && afterReplay.job?.status === 'running'
    && queueCount?.count === 1
    && eventCount?.count === 1;

  addCheck('bulk_idempotent_replay_same_key', passed ? 'PASS' : 'FAIL', {
    first,
    second,
    after_replay: afterReplay,
    queue_count: queueCount?.count || 0,
    event_count: eventCount?.count || 0,
  });
}

async function runBulkNetworkDropAndRetry() {
  const originalFlags = await getOriginalFlags();
  const slug = `rule16-bulk-existing-${suffix}`;
  cleanup.pageSlugs.add(slug);

  const existingPage = await queryOne(
    `insert into public.page_index (
        page_slug, page_type, status, indexing_status, created_at, updated_at
     ) values (
        $1, 'locality_page', 'draft', 'blocked', now(), now()
     ) returning id`,
    [slug]
  );
  cleanup.pageIds.add(existingPage.id);

  const job = await queryOne(
    `insert into public.bulk_generation_jobs (
        name, description, intent_type, base_keyword, content_type, status, created_by, created_at, updated_at
     ) values (
        $1, $2, 'locality', $3, 'local_service', 'planned', 'rule16_audit', now(), now()
     ) returning id`,
    [`rule16 bulk ${suffix}`, 'rule16 audit bulk job', 'bima sakhi opportunity']
  );
  cleanup.bulkJobIds.add(job.id);

  const pages = [
    {
      slug,
      keyword_text: `Bima Sakhi in Audit ${suffix}`,
      page_type: 'locality_page',
      content_level: 'locality_page',
      bulk_job_id: job.id,
    },
  ];

  const before = await getBulkState(job.id, slug);
  const startResult = await callJson(
    `select public.rule16_start_bulk_generation_job($1::uuid, $2::jsonb, $3::text, $4::text, $5::text, $6::text, $7::int) as result`,
    [job.id, JSON.stringify(pages), 'rule16_audit', rememberIdempotencyKey(`bulk-start-${suffix}-${job.id}`), null, null, 0]
  );

  cleanup.queueIds.add(startResult.queue_id);

  const afterDrop = await getBulkState(job.id, slug);

  await setPagegenFlags(true);
  try {
    await qstash.publishJSON({
      url: `${baseUrl}/api/jobs/event-retry`,
      body: { rule16: 'bulk_retry', queueId: startResult.queue_id },
    });

    const afterRetry = await waitFor(async () => {
      const state = await getBulkState(job.id, slug);
      if (state.queue?.status === 'completed' && state.event?.status === 'completed') {
        return state;
      }
      return null;
    }, 120000, 5000);

    const passed = afterDrop.job?.status === 'running'
      && afterDrop.queue?.status === 'pending'
      && afterDrop.event?.status === 'pending'
      && !afterDrop.draft
      && afterRetry?.queue?.status === 'completed'
      && afterRetry?.event?.status === 'completed'
      && afterRetry?.page?.page_slug === slug
      && !afterRetry?.draft;

    addCheck('bulk_network_drop_then_retry_daemon_recovery', passed ? 'PASS' : 'FAIL', {
      before,
      after_drop: afterDrop,
      after_retry: afterRetry,
      start_result: startResult,
    });
  } finally {
    await dbClient.query(
      `update public.system_control_config
          set pagegen_enabled = $1,
              bulk_generation_enabled = $2,
              updated_at = now()
        where singleton_key = true`,
      [originalFlags.pagegen_enabled, originalFlags.bulk_generation_enabled]
    );
  }
}

async function runPagegenPersistFailureAndRetry() {
  const slug = `rule16-pagegen-${suffix}`;
  cleanup.pageSlugs.add(slug);

  const queue = await queryOne(
    `insert into public.generation_queue (
        task_type, payload, status, progress, total_items, created_at
     ) values (
        'pagegen', '{"pages": []}'::jsonb, 'pending', 0, 1, now()
     ) returning id`,
  );
  cleanup.queueIds.add(queue.id);

  const pageRequest = {
    slug,
    keyword_text: `Bima Sakhi in Persist ${suffix}`,
    page_type: 'locality_page',
    content_level: 'locality_page',
  };
  const generatedResult = {
    page_title: `Rule16 Pagegen ${suffix}`,
    hero_headline: `Rule16 Pagegen ${suffix}`,
    local_opportunity_description: `Rule16 generated body ${suffix}`,
    faq_data: [{ question: 'Q1', answer: 'A1' }],
    cta_text: 'Apply Now',
    meta_title: `Rule16 Pagegen Meta ${suffix}`,
    meta_description: `Rule16 Pagegen Description ${suffix}`,
    word_count: 720,
    quality_score: 7.2,
    generation_time_ms: 1234,
    ai_model: 'audit-model',
    image_prompts: { hero: 'audit prompt' },
    content_hash: crypto.createHash('sha256').update(slug).digest('hex'),
  };

  const before = await getPagegenPersistState(slug);
  let failure = null;
  try {
    await callJson(
      `select public.rule16_pagegen_persist_generated_page($1::uuid, $2::jsonb, $3::jsonb, $4::text, $5::text, $6::text, $7::int) as result`,
      [queue.id, JSON.stringify(pageRequest), JSON.stringify(generatedResult), rememberIdempotencyKey(`pagegen-fail-${slug}`), 'location_content_upserted', null, 0]
    );
  } catch (error) {
    failure = error.message;
  }

  const afterFailure = await getPagegenPersistState(slug);
  const retry = await callJson(
    `select public.rule16_pagegen_persist_generated_page($1::uuid, $2::jsonb, $3::jsonb, $4::text, $5::text, $6::text, $7::int) as result`,
    [queue.id, JSON.stringify(pageRequest), JSON.stringify(generatedResult), rememberIdempotencyKey(`pagegen-success-${slug}`), null, null, 0]
  );
  const afterRetry = await getPagegenPersistState(slug);

  if (afterRetry.page?.id) cleanup.pageIds.add(afterRetry.page.id);
  if (afterRetry.draft?.id) cleanup.draftIds.add(afterRetry.draft.id);

  const passed = Boolean(failure)
    && !afterFailure.page
    && !afterFailure.fingerprint
    && !afterFailure.content
    && !afterFailure.draft
    && afterRetry.page?.status === 'draft'
    && afterRetry.page?.indexing_status === 'blocked'
    && afterRetry.fingerprint
    && afterRetry.content
    && afterRetry.draft?.status === 'draft'
    && afterRetry.review_count === 1
    && retry?.draft_id;

  addCheck('pagegen_persist_force_db_error_then_retry', passed ? 'PASS' : 'FAIL', {
    before,
    failure,
    after_failure: afterFailure,
    retry,
    after_retry: afterRetry,
  });
}

async function runCustomPageFailureAndRetry() {
  const page = await queryOne(
    `insert into public.custom_pages (
        slug, title, meta_title, meta_description, status, is_campaign_page, created_at, updated_at
     ) values (
        $1, $2, $3, $4, 'draft', false, now(), now()
     ) returning id`,
    [`rule16-custom-${suffix}`, 'Before Title', 'Before Meta', 'Before Desc']
  );
  cleanup.customPageIds.add(page.id);

  await dbClient.query(
    `insert into public.page_blocks (page_id, block_type, block_order, block_data, created_at, updated_at)
     values ($1, 'Hero', 0, '{"headline":"before"}'::jsonb, now(), now())`,
    [page.id]
  );

  const payload = {
    title: 'After Title',
    meta_title: 'After Meta',
    meta_description: 'After Desc',
    status: 'published',
    is_campaign_page: true,
    blocks: [
      { block_type: 'Hero', block_data: { headline: 'after' } },
      { block_type: 'CTA', block_data: { cta: 'apply' } },
    ],
  };

  const before = await getCustomPageState(page.id);
  let failure = null;
  try {
    await callJson(
      `select public.rule16_update_custom_page($1::uuid, $2::jsonb, $3::uuid, $4::text, $5::text, $6::text, $7::int) as result`,
      [page.id, JSON.stringify(payload), null, rememberIdempotencyKey(`custom-fail-${suffix}-${page.id}`), 'custom_page_updated', null, 0]
    );
  } catch (error) {
    failure = error.message;
  }
  const afterFailure = await getCustomPageState(page.id);
  const retry = await callJson(
    `select public.rule16_update_custom_page($1::uuid, $2::jsonb, $3::uuid, $4::text, $5::text, $6::text, $7::int) as result`,
    [page.id, JSON.stringify(payload), null, rememberIdempotencyKey(`custom-success-${suffix}-${page.id}`), null, null, 0]
  );
  const afterRetry = await getCustomPageState(page.id);

  const passed = Boolean(failure)
    && before.page?.title === 'Before Title'
    && afterFailure.page?.title === 'Before Title'
    && afterFailure.version_count === 0
    && afterFailure.blocks.length === 1
    && afterRetry.page?.title === 'After Title'
    && afterRetry.version_count === 1
    && afterRetry.blocks.length === 2
    && retry?.version_number === 1;

  addCheck('admin_custom_page_force_db_error_then_retry', passed ? 'PASS' : 'FAIL', {
    before,
    failure,
    after_failure: afterFailure,
    retry,
    after_retry: afterRetry,
  });
}

async function runBlogFailureAndRetry() {
  const post = await queryOne(
    `insert into public.blog_posts (slug, title, content, meta_title, meta_description, author, status, created_at)
     values ($1, 'Before Blog', 'before content', 'before meta', 'before desc', 'audit', 'draft', now())
     returning id`,
    [`rule16-blog-${suffix}`]
  );
  cleanup.blogIds.add(post.id);

  const updates = { title: 'After Blog', content: 'after content', meta_title: 'after meta', meta_description: 'after desc', status: 'published' };
  const before = await getBlogState(post.id);
  let failure = null;
  try {
    await callJson(
      `select public.rule16_update_blog_post($1::uuid, $2::jsonb, $3::text, $4::text, $5::text, $6::int) as result`,
      [post.id, JSON.stringify(updates), rememberIdempotencyKey(`blog-fail-${suffix}-${post.id}`), 'blog_post_versioned', null, 0]
    );
  } catch (error) {
    failure = error.message;
  }
  const afterFailure = await getBlogState(post.id);
  const retry = await callJson(
    `select public.rule16_update_blog_post($1::uuid, $2::jsonb, $3::text, $4::text, $5::text, $6::int) as result`,
    [post.id, JSON.stringify(updates), rememberIdempotencyKey(`blog-success-${suffix}-${post.id}`), null, null, 0]
  );
  const afterRetry = await getBlogState(post.id);

  const passed = Boolean(failure)
    && afterFailure.post?.title === 'Before Blog'
    && afterFailure.version_count === 0
    && afterRetry.post?.title === 'After Blog'
    && afterRetry.version_count === 1
    && retry?.post_id === post.id;

  addCheck('admin_blog_force_db_error_then_retry', passed ? 'PASS' : 'FAIL', {
    before,
    failure,
    after_failure: afterFailure,
    retry,
    after_retry: afterRetry,
  });
}

async function runSeoFailureAndRetry() {
  const routePath = `/rule16-seo-${suffix}`;
  cleanup.seoPaths.add(routePath);
  await dbClient.query(
    `insert into public.seo_overrides (route_path, meta_title, meta_description, canonical_url, robots_setting, created_at, updated_at)
     values ($1, 'Before SEO', 'Before Desc', $2, 'index, follow', now(), now())`,
    [routePath, `${baseUrl}${routePath}`]
  );

  const before = await getSeoState(routePath);
  const updates = { meta_title: 'After SEO', meta_description: 'After Desc', canonical_url: `${baseUrl}${routePath}`, robots_setting: 'index, follow', og_image: `${baseUrl}/images/audit.png` };
  let failure = null;
  try {
    await callJson(
      `select public.rule16_upsert_seo_override($1::text, $2::jsonb, $3::text, $4::text, $5::text, $6::int) as result`,
      [routePath, JSON.stringify(updates), rememberIdempotencyKey(`seo-fail-${suffix}`), 'seo_version_inserted', null, 0]
    );
  } catch (error) {
    failure = error.message;
  }
  const afterFailure = await getSeoState(routePath);
  const retry = await callJson(
    `select public.rule16_upsert_seo_override($1::text, $2::jsonb, $3::text, $4::text, $5::text, $6::int) as result`,
    [routePath, JSON.stringify(updates), rememberIdempotencyKey(`seo-success-${suffix}`), null, null, 0]
  );
  const afterRetry = await getSeoState(routePath);

  const passed = Boolean(failure)
    && afterFailure.override?.meta_title === 'Before SEO'
    && afterFailure.version_count === 0
    && afterRetry.override?.meta_title === 'After SEO'
    && afterRetry.version_count === 1
    && retry?.route_path === routePath;

  addCheck('admin_seo_force_db_error_then_retry', passed ? 'PASS' : 'FAIL', {
    before,
    failure,
    after_failure: afterFailure,
    retry,
    after_retry: afterRetry,
  });
}

async function runToolConfigFailureAndRetry() {
  const keyA = `rule16_tool_a_${suffix}`;
  const keyB = `rule16_tool_b_${suffix}`;
  cleanup.toolKeys.add(keyA);
  cleanup.toolKeys.add(keyB);

  await dbClient.query(
    `insert into public.tool_configs (tool_name, config_key, config_value, updated_at)
     values
       ('calculator', $1, '"before-a"'::jsonb, now()),
       ('calculator', $2, '"before-b"'::jsonb, now())`,
    [keyA, keyB]
  );

  const before = await getToolState([keyA, keyB]);
  const updates = { [keyA]: 'after-a', [keyB]: 'after-b' };
  let failure = null;
  try {
    await callJson(
      `select public.rule16_upsert_tool_configs($1::jsonb, $2::text, $3::text, $4::text, $5::text, $6::int) as result`,
      [JSON.stringify(updates), 'calculator', rememberIdempotencyKey(`tools-fail-${suffix}`), `tool_config_applied:${keyA}`, null, 0]
    );
  } catch (error) {
    failure = error.message;
  }
  const afterFailure = await getToolState([keyA, keyB]);
  const retry = await callJson(
    `select public.rule16_upsert_tool_configs($1::jsonb, $2::text, $3::text, $4::text, $5::text, $6::int) as result`,
    [JSON.stringify(updates), 'calculator', rememberIdempotencyKey(`tools-success-${suffix}`), null, null, 0]
  );
  const afterRetry = await getToolState([keyA, keyB]);

  const afterFailureValues = Object.fromEntries(afterFailure.configs.map((row) => [row.config_key, row.config_value]));
  const afterRetryValues = Object.fromEntries(afterRetry.configs.map((row) => [row.config_key, row.config_value]));
  const passed = Boolean(failure)
    && afterFailure.version_count === 0
    && afterFailureValues[keyA] === '"before-a"'
    && afterFailureValues[keyB] === '"before-b"'
    && afterRetry.version_count === 2
    && afterRetryValues[keyA] === '"after-a"'
    && afterRetryValues[keyB] === '"after-b"'
    && retry?.updated_count === 2;

  addCheck('admin_tool_configs_force_db_error_then_retry', passed ? 'PASS' : 'FAIL', {
    before,
    failure,
    after_failure: afterFailure,
    retry,
    after_retry: afterRetry,
  });
}

async function runDraftEditSyncFailureAndRetry() {
  const slug = `rule16-draft-sync-${suffix}`;
  cleanup.pageSlugs.add(slug);
  const page = await queryOne(
    `insert into public.page_index (page_slug, page_type, status, indexing_status, created_at, updated_at)
     values ($1, 'locality_page', 'published', 'pending', now(), now())
     returning id`,
    [slug]
  );
  cleanup.pageIds.add(page.id);

  await dbClient.query(
    `insert into public.location_content (
        page_index_id, content_level, hero_headline, local_opportunity_description,
        meta_title, meta_description, cta_text, faq_data, word_count, created_at, updated_at
     ) values (
        $1, 'locality_page', 'Before Hero', 'Before Body',
        'Before Meta', 'Before Meta Desc', 'Before CTA', '[]'::jsonb, 500, now(), now()
     )`,
    [page.id]
  );

  const draft = await queryOne(
    `insert into public.content_drafts (
        page_index_id, slug, hero_headline, body_content, meta_title, meta_description,
        cta_text, faq_data, word_count, status, created_at, updated_at
     ) values (
        $1, $2, 'Before Hero', 'Before Body', 'Before Meta', 'Before Meta Desc',
        'Before CTA', '[]'::jsonb, 500, 'draft', now(), now()
     ) returning id`,
    [page.id, slug]
  );
  cleanup.draftIds.add(draft.id);

  const updates = {
    hero_headline: 'After Hero',
    body_content: 'After Body',
    meta_title: 'After Meta',
    cta_text: 'After CTA',
  };

  const before = await getDraftSyncState(draft.id, page.id);
  let failure = null;
  try {
    await callJson(
      `select public.rule16_update_content_draft($1::uuid, $2::jsonb, $3::text, $4::text, $5::text, $6::int) as result`,
      [draft.id, JSON.stringify(updates), rememberIdempotencyKey(`draft-sync-fail-${suffix}`), 'draft_updated', null, 0]
    );
  } catch (error) {
    failure = error.message;
  }
  const afterFailure = await getDraftSyncState(draft.id, page.id);
  const retry = await callJson(
    `select public.rule16_update_content_draft($1::uuid, $2::jsonb, $3::text, $4::text, $5::text, $6::int) as result`,
    [draft.id, JSON.stringify(updates), rememberIdempotencyKey(`draft-sync-success-${suffix}`), null, null, 0]
  );
  const afterRetry = await getDraftSyncState(draft.id, page.id);

  const passed = Boolean(failure)
    && afterFailure.draft?.hero_headline === 'Before Hero'
    && afterFailure.content?.hero_headline === 'Before Hero'
    && afterRetry.draft?.hero_headline === 'After Hero'
    && afterRetry.content?.hero_headline === 'After Hero'
    && afterRetry.content?.local_opportunity_description === 'After Body'
    && retry?.draft_id === draft.id;

  addCheck('admin_draft_edit_sync_force_db_error_then_retry', passed ? 'PASS' : 'FAIL', {
    before,
    failure,
    after_failure: afterFailure,
    retry,
    after_retry: afterRetry,
  });
}

async function runDraftTransitionFailureAndRetry(action) {
  const slug = `rule16-transition-${action}-${suffix}`;
  cleanup.pageSlugs.add(slug);
  const page = await queryOne(
    `insert into public.page_index (page_slug, page_type, status, indexing_status, created_at, updated_at)
     values ($1, 'locality_page', 'published', 'indexed', now(), now())
     returning id`,
    [slug]
  );
  cleanup.pageIds.add(page.id);

  const draft = await queryOne(
    `insert into public.content_drafts (
        page_index_id, slug, status, published_at, created_at, updated_at
     ) values (
        $1, $2, 'published', now(), now(), now()
     ) returning id`,
    [page.id, slug]
  );
  cleanup.draftIds.add(draft.id);

  const before = await getPublishState(slug, draft.id);
  let failure = null;
  try {
    await callJson(
      `select public.rule16_transition_draft_status($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text, $7::int) as result`,
      [draft.id, action, 'rule16_audit', rememberIdempotencyKey(`${action}-fail-${suffix}`), 'page_index_transitioned', null, 0]
    );
  } catch (error) {
    failure = error.message;
  }
  const afterFailure = await getPublishState(slug, draft.id);
  const retry = await callJson(
    `select public.rule16_transition_draft_status($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text, $7::int) as result`,
    [draft.id, action, 'rule16_audit', rememberIdempotencyKey(`${action}-success-${suffix}`), null, null, 0]
  );
  const afterRetry = await getPublishState(slug, draft.id);

  const expectedDraftStatus = action === 'unpublish' ? 'draft' : 'archived';
  const expectedPageStatus = action === 'unpublish' ? 'unpublished' : 'archived';

  const passed = Boolean(failure)
    && afterFailure.page?.status === 'published'
    && afterFailure.draft?.status === 'published'
    && afterRetry.page?.status === expectedPageStatus
    && afterRetry.page?.indexing_status === 'blocked'
    && afterRetry.draft?.status === expectedDraftStatus
    && retry?.page_status === expectedPageStatus;

  addCheck(`admin_draft_${action}_force_db_error_then_retry`, passed ? 'PASS' : 'FAIL', {
    before,
    failure,
    after_failure: afterFailure,
    retry,
    after_retry: afterRetry,
  });
}

async function performCleanup() {
  try {
    if (cleanup.draftIds.size > 0) {
      const draftIds = [...cleanup.draftIds];
      await dbClient.query(`delete from public.content_drafts where id = any($1::uuid[])`, [draftIds]);
    }
    if (cleanup.pageSlugs.size > 0) {
      await dbClient.query(`delete from public.content_drafts where slug = any($1::text[])`, [[...cleanup.pageSlugs]]);
    }
    if (cleanup.pageIds.size > 0) {
      const pageIds = [...cleanup.pageIds];
      await dbClient.query(`delete from public.content_review_queue where page_index_id = any($1::uuid[])`, [pageIds]);
      await dbClient.query(`delete from public.content_fingerprints where page_index_id = any($1::uuid[])`, [pageIds]);
      await dbClient.query(`delete from public.location_content where page_index_id = any($1::uuid[])`, [pageIds]);
      await dbClient.query(`delete from public.page_index where id = any($1::uuid[])`, [pageIds]);
    }
    if (cleanup.pageSlugs.size > 0) {
      await dbClient.query(`delete from public.page_index where page_slug = any($1::text[])`, [[...cleanup.pageSlugs]]);
    }
    if (cleanup.customPageIds.size > 0) {
      await dbClient.query(`delete from public.custom_pages where id = any($1::uuid[])`, [[...cleanup.customPageIds]]);
    }
    if (cleanup.blogIds.size > 0) {
      await dbClient.query(`delete from public.blog_posts where id = any($1::uuid[])`, [[...cleanup.blogIds]]);
    }
    if (cleanup.seoPaths.size > 0) {
      await dbClient.query(`delete from public.seo_overrides where route_path = any($1::text[])`, [[...cleanup.seoPaths]]);
    }
    if (cleanup.toolKeys.size > 0) {
      await dbClient.query(`delete from public.tool_configs where config_key = any($1::text[])`, [[...cleanup.toolKeys]]);
    }
    if (cleanup.queueIds.size > 0) {
      const queueIds = [...cleanup.queueIds];
      await dbClient.query(`delete from public.event_store where payload ->> 'queueId' = any($1::text[])`, [queueIds]);
    }
    if (cleanup.bulkJobIds.size > 0) {
      await dbClient.query(`delete from public.content_drafts where bulk_job_id = any($1::uuid[])`, [[...cleanup.bulkJobIds]]);
      await dbClient.query(`delete from public.bulk_generation_jobs where id = any($1::uuid[])`, [[...cleanup.bulkJobIds]]);
    }
    if (cleanup.queueIds.size > 0) {
      await dbClient.query(`delete from public.generation_queue where id = any($1::uuid[])`, [[...cleanup.queueIds]]);
    }
    if (cleanup.idempotencyKeys.size > 0) {
      await dbClient.query(`delete from public.idempotency_keys where event_id = any($1::text[])`, [[...cleanup.idempotencyKeys]]);
    }
  } catch (error) {
    addCheck('cleanup', 'FAIL', { error: error.message });
  }
}

async function main() {
  await dbClient.connect();
  try {
    addCheck('env_presence_masked', 'INFO', {
      Database_Password: Boolean(env.Database_Password),
      QSTASH_TOKEN: Boolean(env.QSTASH_TOKEN),
      SUPABASE_URL: Boolean(env.SUPABASE_URL),
    });

    await runPublishFailureAndRetry();
    await runPublishKillProbe();
    await runPublishNetworkDropProbe();
    await runPublishIdempotencyReplay();
    await runBulkFailureAndRetry();
    await runBulkKillProbe();
    await runBulkIdempotencyReplay();
    await runBulkNetworkDropAndRetry();
    await runPagegenPersistFailureAndRetry();
    await runCustomPageFailureAndRetry();
    await runBlogFailureAndRetry();
    await runSeoFailureAndRetry();
    await runToolConfigFailureAndRetry();
    await runDraftEditSyncFailureAndRetry();
    await runDraftTransitionFailureAndRetry('unpublish');
    await runDraftTransitionFailureAndRetry('archive');

    const requiredChecks = result.checks.filter((check) => check.status === 'FAIL');
    addCheck('rule16_transactional_integrity_verdict', requiredChecks.length === 0 ? 'PASS' : 'FAIL', {
      failed_checks: requiredChecks.map((check) => check.name),
      total_checks: result.checks.length,
    });
  } catch (error) {
    recordError(error);
    addCheck('rule16_runtime_execution', 'FAIL', { error: error.message });
  } finally {
    await performCleanup();
    await dbClient.end();
    result.finished_at = new Date().toISOString();
    fs.mkdirSync(resultsDir, { recursive: true });
    const filePath = path.join(resultsDir, `${result.finished_at.replace(/[:.]/g, '-')}-rule16-transactional-integrity.json`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    console.log(`RESULT_FILE=${filePath}`);
    if (result.status !== 'PASS') {
      process.exitCode = 1;
    }
  }
}

main();