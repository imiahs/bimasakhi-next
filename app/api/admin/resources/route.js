import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

// GET: Fetch all resources
export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('resources')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ resources: data });
    } catch (error) {
        console.error('API /admin/resources GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }
});

// POST: Create a new resource record
export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();

        const { data, error } = await supabase
            .from('resources')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, resource: data });
    } catch (error) {
        console.error('API /admin/resources POST error:', error);
        return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }
});

// PUT: Update an existing resource
export const PUT = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();
        const { id, ...updates } = payload;

        if (!id) return NextResponse.json({ error: 'Missing resource ID' }, { status: 400 });

        const { data, error } = await supabase
            .from('resources')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, resource: data });
    } catch (error) {
        console.error('API /admin/resources PUT error:', error);
        return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
    }
});

// DELETE: Remove a resource
export const DELETE = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing resource ID' }, { status: 400 });

        const { error } = await supabase
            .from('resources')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Resource deleted' });
    } catch (error) {
        console.error('API /admin/resources DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
    }
});
