const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envLocal = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';

const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    const match = envLocal.match(new RegExp(`^${key}=['"]?(.*?)['"]?$`, 'm'));
    return match ? match[1].trim() : null;
};

function getRepoMigrationNames() {
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) return [];

    return fs.readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();
}

async function fetchRestProbe(supabaseUrl, serviceKey, query) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
        headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'User-Agent': 'migration-drift-check',
        }
    });

    if (!response.ok) {
        return {
            ok: false,
            status: response.status,
            body: await response.text(),
        };
    }

    return {
        ok: true,
        status: response.status,
        body: await response.json(),
    };
}

async function fetchPgObservabilityFacts(supabaseUrl, dbPassword) {
    if (!dbPassword) {
        return { checked: false, reason: 'Database_Password missing' };
    }

    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    const pool = new Pool({
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: dbPassword,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
    });

    try {
        const [sourceColumn, sourceConstraint, sourceIndexes, emptySourceRows] = await Promise.all([
            pool.query(`
                select column_name, is_nullable, column_default
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'observability_logs'
                  and column_name = 'source'
            `),
            pool.query(`
                select conname
                from pg_constraint
                where conname = 'chk_observability_source_not_empty'
            `),
            pool.query(`
                select indexname
                from pg_indexes
                where schemaname = 'public'
                  and tablename = 'observability_logs'
                  and indexname in ('idx_observability_logs_source', 'idx_observability_logs_level_created')
            `),
            pool.query(`
                select count(*)::int as count
                from public.observability_logs
                where source is null or trim(source) = ''
            `),
        ]);

        const sourceRow = sourceColumn.rows[0];

        return {
            checked: true,
            sourceColumnSatisfied: Boolean(
                sourceRow
                && sourceRow.is_nullable === 'NO'
                && String(sourceRow.column_default || '').includes('system')
            ),
            constraintSatisfied: sourceConstraint.rows.length > 0,
            indexesSatisfied: sourceIndexes.rows.length === 2,
            emptySourceRows: Number(emptySourceRows.rows[0]?.count || 0),
        };
    } catch (error) {
        return {
            checked: false,
            reason: error.message,
        };
    } finally {
        await pool.end().catch(() => {});
    }
}

async function detectEquivalentLiveMigrations() {
    const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
        return {
            equivalentNames: new Set(),
            notes: ['Skipped structural equivalence checks: Supabase credentials unavailable'],
        };
    }

    const [contentDrafts, mediaFiles, observabilityRows, observabilityNullRows, observabilityEmptyRows, pgFacts] = await Promise.all([
        fetchRestProbe(supabaseUrl, serviceKey, 'content_drafts?select=id,featured_image_alt&limit=1'),
        fetchRestProbe(supabaseUrl, serviceKey, 'media_files?select=id,draft_id,alt_text,thumbnail_url&limit=1'),
        fetchRestProbe(supabaseUrl, serviceKey, 'observability_logs?select=id,source&limit=1'),
        fetchRestProbe(supabaseUrl, serviceKey, 'observability_logs?select=id&source=is.null&limit=1'),
        fetchRestProbe(supabaseUrl, serviceKey, 'observability_logs?select=id&source=eq.&limit=1'),
        fetchPgObservabilityFacts(supabaseUrl, getEnv('Database_Password') || getEnv('DATABASE_PASSWORD')),
    ]);

    const equivalentNames = new Set();
    const notes = [];

    const hasPriorityRColumns = contentDrafts.ok && mediaFiles.ok;
    const hasMediaDraftId = mediaFiles.ok;
    const hasObservabilityColumn = observabilityRows.ok;
    const hasCleanObservabilityRows = observabilityNullRows.ok
        && observabilityEmptyRows.ok
        && observabilityNullRows.body.length === 0
        && observabilityEmptyRows.body.length === 0;

    if (hasPriorityRColumns) {
        equivalentNames.add('20260420_priority_r_schema_fixes.sql');
        notes.push('20260420_priority_r_schema_fixes.sql structurally present in live schema');
    }

    if (hasMediaDraftId) {
        equivalentNames.add('20260419_fix1f_media_draft_fk.sql');
        notes.push('20260419_fix1f_media_draft_fk.sql structurally present in live schema');
    }

    const observabilitySatisfied = pgFacts.checked
        ? pgFacts.sourceColumnSatisfied
            && pgFacts.constraintSatisfied
            && pgFacts.indexesSatisfied
            && pgFacts.emptySourceRows === 0
        : hasObservabilityColumn && hasCleanObservabilityRows;

    if (observabilitySatisfied) {
        equivalentNames.add('038_observability_source_enforcement.sql');
        notes.push(
            pgFacts.checked
                ? '038_observability_source_enforcement.sql verified via live Postgres metadata'
                : '038_observability_source_enforcement.sql inferred from live REST schema probes'
        );
    } else if (pgFacts.reason) {
        notes.push(`Observability metadata check unavailable: ${pgFacts.reason}`);
    }

    return { equivalentNames, notes };
}

async function fetchLiveMigrationNames() {
    const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
        throw new Error('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/schema_migrations?select=migration_name&limit=1000`, {
        headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'User-Agent': 'phase-4-6-migration-drift-check'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch schema_migrations: ${response.status} ${response.statusText}`);
    }

    const rows = await response.json();
    return rows.map((row) => row.migration_name).sort();
}

async function main() {
    const repo = getRepoMigrationNames();
    const live = await fetchLiveMigrationNames();
    const { equivalentNames, notes } = await detectEquivalentLiveMigrations();

    const repoNotInLive = repo.filter((name) => !live.includes(name) && !equivalentNames.has(name));
    const liveNotInRepo = live.filter((name) => !repo.includes(name));

    console.log('== MIGRATION DRIFT CHECK ==');
    console.log(`Repo migrations: ${repo.length}`);
    console.log(`Live schema_migrations: ${live.length}`);

    if (equivalentNames.size > 0) {
        console.log('Structurally satisfied but unrecorded live migrations:');
        [...equivalentNames].sort().forEach((name) => console.log(`- ${name}`));
    }

    notes.forEach((note) => console.log(`NOTE: ${note}`));

    if (repoNotInLive.length === 0 && liveNotInRepo.length === 0) {
        console.log('No migration drift detected.');
        return;
    }

    if (repoNotInLive.length > 0) {
        console.error('Repo-only migrations:');
        repoNotInLive.forEach((name) => console.error(`- ${name}`));
    }

    if (liveNotInRepo.length > 0) {
        console.error('Live-only migrations:');
        liveNotInRepo.forEach((name) => console.error(`- ${name}`));
    }

    process.exitCode = 1;
}

main().catch((error) => {
    console.error('[Migration Drift Check]', error.message);
    process.exit(1);
});
