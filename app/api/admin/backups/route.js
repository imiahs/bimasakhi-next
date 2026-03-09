import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const backupsDir = path.join(process.cwd(), 'backups');

        if (!fs.existsSync(backupsDir)) {
            return NextResponse.json({ backups: [] });
        }

        const entries = fs.readdirSync(backupsDir, { withFileTypes: true });

        const backups = entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const backupPath = path.join(backupsDir, dirent.name);
                const files = fs.readdirSync(backupPath);

                // Calculate total size roughly
                let sizeBytes = 0;
                files.forEach(file => {
                    const stats = fs.statSync(path.join(backupPath, file));
                    sizeBytes += stats.size;
                });

                return {
                    id: dirent.name,
                    timestamp: dirent.name, // Usually formatted as ISO
                    files,
                    sizeBytes
                };
            })
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Newest first

        return NextResponse.json({ backups });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch backups', details: error.message }, { status: 500 });
    }
}
