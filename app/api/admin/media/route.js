import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

// GET: Fetch all media files
export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('media_files')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ media: data });
    } catch (error) {
        console.error('API /admin/media GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
    }
});

// DELETE: Remove a media file (Storage file + Database record)
export const DELETE = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing media ID' }, { status: 400 });

        // Fix 1e: Fetch the record first to get the storage path
        const { data: record, error: fetchError } = await supabase
            .from('media_files')
            .select('file_url')
            .eq('id', id)
            .single();

        if (fetchError || !record) {
            return NextResponse.json({ error: 'Media record not found' }, { status: 404 });
        }

        // Delete from Supabase Storage if URL contains the storage bucket path
        if (record.file_url) {
            try {
                // Extract storage path from full URL: .../storage/v1/object/public/media/filename.webp
                const url = new URL(record.file_url);
                const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/media\/(.+)/);
                if (pathMatch) {
                    await supabase.storage.from('media').remove([pathMatch[1]]);
                }
            } catch (storageErr) {
                console.warn('Storage file delete warning (non-blocking):', storageErr.message);
            }
        }

        // Delete the database record
        const { error } = await supabase
            .from('media_files')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Media file and record deleted' });
    } catch (error) {
        console.error('API /admin/media DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
    }
});
