import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import sharp from 'sharp';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const runtime = 'nodejs'; // Sharp requires Node runtime, not Edge

/**
 * POST /api/admin/media/upload
 *
 * C4 fix: Replaces fs.writeFile (read-only on Vercel) with Supabase Storage.
 * C5 fix: Returns { file: { file_url } } so draft editor reads data.file.file_url.
 *
 * Pre-condition: Supabase bucket 'media' must be created manually (public).
 * Bible: Section 42 (Media Management System), Rule 16 (Data Integrity)
 */
const STORAGE_BUCKET = 'media';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_PREFIXES = ['image/'];

export const POST = withAdminAuth(async (request, user) => {
    const supabase = getServiceSupabase();
    let webpName = null;
    let thumbName = null;

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
        }

        // File type validation (415 Unsupported Media Type)
        const mimeType = file.type || '';
        if (!ALLOWED_MIME_PREFIXES.some(p => mimeType.startsWith(p))) {
            return NextResponse.json(
                { success: false, error: `Unsupported file type "${mimeType}". Only images are allowed.` },
                { status: 415 }
            );
        }

        // File size validation (413 Payload Too Large)
        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { success: false, error: `File too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.` },
                { status: 413 }
            );
        }

        const originalName = file.name;
        const normalizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').split('.')[0];
        const timestamp = Date.now();

        // Output filenames (stored in Supabase Storage)
        webpName = `${normalizedName}-${timestamp}.webp`;
        thumbName = `${normalizedName}-${timestamp}-thumb.webp`;

        // 1. Process images in-memory (no filesystem write — Vercel production safe)
        const metadata = await sharp(buffer).metadata();
        const mainImageBuffer = await sharp(buffer)
            .webp({ quality: 80 })
            .toBuffer();

        const thumbBuffer = await sharp(buffer)
            .resize({ width: 300, withoutEnlargement: true })
            .webp({ quality: 70 })
            .toBuffer();

        // 2. Upload to Supabase Storage
        const [mainUpload, thumbUpload] = await Promise.all([
            supabase.storage.from(STORAGE_BUCKET).upload(webpName, mainImageBuffer, {
                contentType: 'image/webp',
                upsert: false,
            }),
            supabase.storage.from(STORAGE_BUCKET).upload(thumbName, thumbBuffer, {
                contentType: 'image/webp',
                upsert: false,
            }),
        ]);

        if (mainUpload.error) {
            // Storage upload failed — nothing to clean up yet
            webpName = null;
            thumbName = null;
            await logObservability(supabase, 'ERROR', `Storage upload failed: ${mainUpload.error.message}`, user?.id);
            return NextResponse.json(
                { success: false, error: 'Storage upload failed. Ensure bucket "media" exists and is public in Supabase Dashboard.' },
                { status: 500 }
            );
        }

        // 3. Get public URLs
        const { data: mainUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(webpName);
        const { data: thumbUrlData } = thumbUpload.error
            ? { data: { publicUrl: null } }
            : supabase.storage.from(STORAGE_BUCKET).getPublicUrl(thumbName);

        const fileUrl = mainUrlData.publicUrl;
        const thumbUrl = thumbUrlData?.publicUrl || null;

        // 4. Insert record into media_files table
        const dbEntry = {
            file_name: originalName,
            file_url: fileUrl,
            thumbnail_url: thumbUrl,
            file_type: 'image/webp',
            size_bytes: mainImageBuffer.length,
            width: metadata.width,
            height: metadata.height,
            format: 'webp',
            uploaded_by: user?.id || 'admin',
        };

        const { data, error: dbError } = await supabase
            .from('media_files')
            .insert(dbEntry)
            .select()
            .single();

        if (dbError) {
            // Rule 16 (Data Integrity): DB failed → compensating delete from Storage
            await Promise.allSettled([
                supabase.storage.from(STORAGE_BUCKET).remove([webpName]),
                thumbName ? supabase.storage.from(STORAGE_BUCKET).remove([thumbName]) : Promise.resolve(),
            ]);
            webpName = null;
            thumbName = null;
            await logObservability(supabase, 'ERROR', `media_files DB insert failed (Storage files cleaned up): ${dbError.message}`, user?.id);
            return NextResponse.json(
                { success: false, error: 'Database record creation failed. Upload has been cleaned up. Please try again.' },
                { status: 500 }
            );
        }

        // Success
        await logObservability(supabase, 'INFO', `Image uploaded: ${originalName} → ${webpName} (${(buffer.length / 1024).toFixed(0)} KB)`, user?.id);

        return NextResponse.json({
            success: true,
            message: 'Image processed, converted to WebP, and stored in Supabase Storage.',
            file: data,
        });

    } catch (err) {
        // Compensating cleanup if storage files were created before the crash
        try {
            const supabase = getServiceSupabase();
            const toRemove = [webpName, thumbName].filter(Boolean);
            if (toRemove.length) await supabase.storage.from(STORAGE_BUCKET).remove(toRemove);
        } catch (_) {}

        console.error('[MediaUpload] Unhandled error:', err.message);
        return NextResponse.json({ success: false, error: 'Image processing failed internally.' }, { status: 500 });
    }
});

async function logObservability(supabase, level, message, userId) {
    try {
        await supabase.from('observability_logs').insert({
            level,
            message,
            source: 'media_upload',
            metadata: { uploaded_by: userId },
        });
    } catch (_) {
        // Observability failure must never break the main flow
    }
}
