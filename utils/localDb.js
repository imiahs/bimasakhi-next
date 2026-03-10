// localDb.js — DEPRECATED
// SQLite is incompatible with Vercel's ephemeral serverless filesystem.
// All data storage has been migrated to Supabase.
// This file is kept as a no-op to prevent import errors in files not yet migrated.

export function getLocalDb() {
    return null;
}
