/**
 * Secure Admin Setup Script
 * 
 * Creates an admin user using environment variables instead of hardcoded credentials.
 * 
 * Required environment variables:
 *   ADMIN_EMAIL          - Admin email address
 *   ADMIN_PASSWORD_PLAIN - Admin password (will be bcrypt-hashed)
 *   ADMIN_NAME           - (optional) Admin display name, defaults to "Super Admin"
 * 
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD_PLAIN=MySecurePass123 node scripts/setup-admin.js
 * 
 * On Windows PowerShell:
 *   $env:ADMIN_EMAIL="admin@example.com"; $env:ADMIN_PASSWORD_PLAIN="MySecurePass123"; node scripts/setup-admin.js
 */

const fs = require('fs');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// Load .env.local if present
const envLocal = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    const match = envLocal.match(new RegExp(`^${key}=['"]?(.*?)['"]?$`, 'm'));
    return match ? match[1].trim() : null;
};

async function setupAdmin() {
    const email = getEnv('ADMIN_EMAIL');
    const passwordPlain = getEnv('ADMIN_PASSWORD_PLAIN');
    const name = getEnv('ADMIN_NAME') || 'Super Admin';

    if (!email || !passwordPlain) {
        console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD_PLAIN environment variables are required.');
        console.error('Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD_PLAIN=secret node scripts/setup-admin.js');
        process.exit(1);
    }

    if (passwordPlain.length < 10) {
        console.error('ERROR: Admin password must be at least 10 characters long.');
        process.exit(1);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(passwordPlain, salt);

    // Connect to database
    let connectionString = getEnv('SUPABASE_DIRECT_URL');
    if (!connectionString) {
        const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
        if (!supabaseUrl) throw new Error('Missing SUPABASE_DIRECT_URL or NEXT_PUBLIC_SUPABASE_URL');
        const host = supabaseUrl.replace('https://', 'db.');
        const dbPassword = getEnv('Database_Password');
        if (!dbPassword) throw new Error('Missing Database_Password');
        connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@${host}:5432/postgres`;
    }

    const client = new Client({ connectionString });
    await client.connect();

    try {
        const result = await client.query(
            `INSERT INTO public.admin_users (email, name, password_hash, role, active)
             VALUES ($1, $2, $3, 'super_admin', true)
             ON CONFLICT (email) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                name = EXCLUDED.name,
                active = true
             RETURNING id, email, role`,
            [email, name, passwordHash]
        );

        if (result.rows.length > 0) {
            console.log(`✅ Admin user created/updated successfully:`);
            console.log(`   Email: ${result.rows[0].email}`);
            console.log(`   Role:  ${result.rows[0].role}`);
            console.log(`   ID:    ${result.rows[0].id}`);
        }
    } finally {
        await client.end();
    }
}

setupAdmin().catch((err) => {
    console.error('Setup failed:', err.message);
    process.exit(1);
});
