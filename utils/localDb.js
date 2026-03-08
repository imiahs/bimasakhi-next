import Database from 'better-sqlite3';
import path from 'path';

let db;

export function getLocalDb() {
    if (db) return db;

    try {
        const dbPath = path.resolve(process.cwd(), 'observability.db');
        db = new Database(dbPath, { verbose: console.log });
        console.log('Connected to local SQLite observability database.');

        // Ensure tables exist on boot
        db.exec(`
            CREATE TABLE IF NOT EXISTS observability_logs (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                source TEXT NOT NULL,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS api_requests (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                endpoint TEXT NOT NULL,
                method TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                duration_ms INTEGER,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS lead_queue (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                name TEXT NOT NULL,
                mobile TEXT NOT NULL,
                city TEXT,
                source TEXT,
                synced_to_zoho INTEGER DEFAULT 0,
                synced_to_supabase INTEGER DEFAULT 0,
                payload TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sync_failures (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                service TEXT NOT NULL,
                payload TEXT NOT NULL,
                error TEXT NOT NULL,
                retry_count INTEGER DEFAULT 0,
                next_retry_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS event_stream (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                event_type TEXT NOT NULL,
                session_id TEXT,
                route_path TEXT NOT NULL,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (error) {
        console.error('Failed to initialize local SQLite database:', error);
    }

    return db;
}
