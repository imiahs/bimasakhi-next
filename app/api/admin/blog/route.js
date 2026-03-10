import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

// GET: Fetch all blog posts
export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');

        if (slug) {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .eq('slug', slug)
                .single();
            if (error) throw error;
            return NextResponse.json({ post: data });
        }

        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ posts: data });
    } catch (error) {
        console.error('API /admin/blog GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
});

// POST: Create a new blog post
export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();

        // Ensure slug is unique or handles empty appropriately
        if (!payload.slug) {
            payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }

        const { data, error } = await supabase
            .from('blog_posts')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, post: data });
    } catch (error) {
        console.error('API /admin/blog POST error:', error);
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
});

// PUT: Update an existing blog post
export const PUT = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();
        const { id, ...updates } = payload;

        if (!id) return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });

        // Phase 18: Data Versioning Hook (Snapshot before update)
        const { data: currentPost, error: fetchErr } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', id)
            .single();

        if (!fetchErr && currentPost) {
            await supabase.from('blog_post_versions').insert({
                post_id: currentPost.id,
                title: currentPost.title,
                content: currentPost.content,
                meta_title: currentPost.meta_title,
                meta_description: currentPost.meta_description,
                author: currentPost.author,
                status: currentPost.status
            });
        }

        const { data, error } = await supabase
            .from('blog_posts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, post: data });
    } catch (error) {
        console.error('API /admin/blog PUT error:', error);
        return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }
});

// DELETE: Remove a blog post
export const DELETE = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });

        const { error } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error('API /admin/blog DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }
});
