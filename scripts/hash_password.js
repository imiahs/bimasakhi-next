#!/usr/bin/env node
/**
 * scripts/hash_password.js
 *
 * Generates a bcrypt hash for use in admin_users table.
 * Run: node scripts/hash_password.js YOUR_PASSWORD
 *
 * Stage 4 fix (C7): Part of RBAC migration setup.
 */
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
    console.error('Usage: node scripts/hash_password.js YOUR_PASSWORD');
    process.exit(1);
}

if (password.length < 12) {
    console.error('Password must be at least 12 characters for admin accounts.');
    process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log('\nPassword hash (copy this into admin_users INSERT):');
console.log(hash);
console.log('\nSQL to insert super_admin:');
console.log(`INSERT INTO admin_users (email, name, password_hash, role)`);
console.log(`VALUES ('admin@bimasakhi.com', 'CEO', '${hash}', 'super_admin')`);
console.log(`ON CONFLICT (email) DO NOTHING;`);
