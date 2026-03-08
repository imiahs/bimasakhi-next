import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs'; // Sharp requires Node runtime, not Edge

// POST /api/admin/media/upload
export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name;
        const normalizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').split('.')[0];

        // Output filenames
        const webpName = `${normalizedName}-${Date.now()}.webp`;
        const thumbName = `${normalizedName}-${Date.now()}-thumb.webp`;

        const publicDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.mkdir(publicDir, { recursive: true });

        // 1. Process Main Image to optimized WebP
        const metadata = await sharp(buffer).metadata();
        const mainImageBuffer = await sharp(buffer)
            .webp({ quality: 80 })
            .toBuffer();

        await fs.writeFile(path.join(publicDir, webpName), mainImageBuffer);

        // 2. Generate Thumbnail (max 300px width)
        await sharp(buffer)
            .resize({ width: 300, withoutEnlargement: true })
            .webp({ quality: 70 })
            .toFile(path.join(publicDir, thumbName));

        // 3. Store in Supabase Media Table
        const supabase = getServiceSupabase();

        const fileUrl = `/uploads/${webpName}`;
        const dbEntry = {
            file_name: originalName,
            file_url: fileUrl,
            file_type: 'image/webp',
            size_bytes: mainImageBuffer.length,
            width: metadata.width,
            height: metadata.height,
            format: 'webp',
            uploaded_by: 'Admin Pipeline' // Typically extract from JWT payload
        };

        const { data, error } = await supabase.from('media_files').insert(dbEntry).select().single();

        if (error) {
            console.error('Supabase media table insert error:', error);
            return NextResponse.json({ error: 'Database entry skipped/failed, but file saved locally.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Image fully processed, converted to WebP, and stored.',
            file: data
        });

    } catch (error) {
        console.error('Media pipeline error:', error);
        return NextResponse.json({ error: 'Image processing failed internally.' }, { status: 500 });
    }
}
