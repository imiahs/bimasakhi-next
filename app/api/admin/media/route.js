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

// DELETE: Remove a media file (Database record)
export const DELETE = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing media ID' }, { status: 400 });

        // Note: Ideally, we would also delete the file from the local filesystem / S3 here
        // using fs.unlink for local files inside /public/uploads/

        const { error } = await supabase
            .from('media_files')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Media record deleted' });
    } catch (error) {
        console.error('API /admin/media DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
    }
});
