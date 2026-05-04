import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const dynamic = 'force-dynamic';

const SNAPSHOT_TABLES = [
    'system_control_config',
    'feature_flags',
    'workflow_config',
    'seo_overrides',
    'content_drafts',
    'page_index',
    'location_content',
    'generation_queue',
    'leads',
    'lead_events',
    'lead_metadata',
    'job_runs',
    'job_dead_letters',
    'event_store'
];

function getBackupsDir() {
    return path.join(process.cwd(), 'backups');
}

function getDirectorySizeBytes(dirPath) {
    let sizeBytes = 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            sizeBytes += getDirectorySizeBytes(entryPath);
        } else {
            sizeBytes += fs.statSync(entryPath).size;
        }
    }

    return sizeBytes;
}

function listBackups(backupsDir) {
    if (!fs.existsSync(backupsDir)) {
        return [];
    }

    return fs.readdirSync(backupsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => {
            const backupPath = path.join(backupsDir, dirent.name);
            const files = fs.readdirSync(backupPath);

            return {
                id: dirent.name,
                timestamp: dirent.name,
                files,
                sizeBytes: getDirectorySizeBytes(backupPath)
            };
        })
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

async function fetchTableSnapshot(supabase, tableName, pageSize = 1000) {
    const rows = [];
    let from = 0;

    while (true) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(from, from + pageSize - 1);

        if (error) {
            throw new Error(`${tableName}: ${error.message}`);
        }

        const batch = data || [];
        rows.push(...batch);

        if (batch.length < pageSize) {
            break;
        }

        from += pageSize;
    }

    return rows;
}

export const GET = withAdminAuth(async (request, user) => {
    try {
        const backups = listBackups(getBackupsDir());

        return NextResponse.json({ backups });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch backups', details: error.message }, { status: 500 });
    }
});

export const POST = withAdminAuth(async () => {
    const backupsDir = getBackupsDir();
    const backupId = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupsDir, backupId);

    try {
        fs.mkdirSync(backupPath, { recursive: true });

        const supabase = getServiceSupabase();
        const manifest = {
            id: backupId,
            created_at: new Date().toISOString(),
            tables: [],
        };

        for (const tableName of SNAPSHOT_TABLES) {
            const rows = await fetchTableSnapshot(supabase, tableName);
            const fileName = `${tableName}.json`;
            fs.writeFileSync(path.join(backupPath, fileName), JSON.stringify(rows, null, 2), 'utf8');
            manifest.tables.push({ table: tableName, file: fileName, rowCount: rows.length });
        }

        fs.writeFileSync(path.join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

        return NextResponse.json({
            success: true,
            backup: {
                id: backupId,
                timestamp: backupId,
                files: fs.readdirSync(backupPath),
                sizeBytes: getDirectorySizeBytes(backupPath)
            }
        });
    } catch (error) {
        fs.rmSync(backupPath, { recursive: true, force: true });
        return NextResponse.json({ error: 'Failed to create backup', details: error.message }, { status: 500 });
    }
});
