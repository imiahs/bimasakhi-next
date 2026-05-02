import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

function loadEnvFile() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        throw new Error(`.env.local not found at ${envPath}`);
    }

    const entries = fs.readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
            const separatorIndex = line.indexOf('=');
            const key = line.slice(0, separatorIndex).trim();
            let value = line.slice(separatorIndex + 1).trim();

            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            return [key, value];
        });

    return Object.fromEntries(entries);
}

const env = loadEnvFile();
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const databasePassword = env.Database_Password;

if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is required.');
}

if (!databasePassword) {
    throw new Error('Database_Password is required.');
}

const projectRef = new URL(baseUrl).hostname.split('.')[0];
const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260502093000_p0_2_navigation_unification.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const pool = new pg.Pool({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: databasePassword,
    ssl: { rejectUnauthorized: false },
});

try {
    await pool.query(sql);
    console.log('APPLIED_P0_2_NAVIGATION_MIGRATION');
} finally {
    await pool.end();
}