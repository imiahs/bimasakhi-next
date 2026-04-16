const fs = require('fs');
const path = require('path');

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

    const repoNotInLive = repo.filter((name) => !live.includes(name));
    const liveNotInRepo = live.filter((name) => !repo.includes(name));

    console.log('== MIGRATION DRIFT CHECK ==');
    console.log(`Repo migrations: ${repo.length}`);
    console.log(`Live schema_migrations: ${live.length}`);

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
