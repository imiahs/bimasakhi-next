import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs'; // Use Node runtime for fs operations

// POST /api/admin/resources/upload
export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name;
        // Strip out non-alphanumeric chars
        const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const finalName = `${Date.now()}-${safeName}`;

        const publicDir = path.join(process.cwd(), 'public', 'downloads');
        await fs.mkdir(publicDir, { recursive: true });

        const filePath = path.join(publicDir, finalName);
        await fs.writeFile(filePath, buffer);

        const fileUrl = `/downloads/${finalName}`;

        return NextResponse.json({
            success: true,
            message: 'File uploaded successfully',
            file_url: fileUrl
        });

    } catch (error) {
        console.error('Resource upload error:', error);
        return NextResponse.json({ error: 'File upload failed internally.' }, { status: 500 });
    }
}
