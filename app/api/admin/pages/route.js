import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ pages: [] });
        }

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('custom_pages')
            .select(`
                id,
                slug,
                title,
                status,
                is_campaign_page,
                updated_at
            `)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ pages: data });
    } catch (err) {
        console.error("Error fetching pages:", err);
        return NextResponse.json({ error: "Failed to fetch pages." }, { status: 500 });
    }
});

export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ error: 'Supabase required.' }, { status: 400 });
        }

        const reqData = await request.json();
        const { title, slug, is_campaign_page } = reqData;

        if (!title || !slug) {
            return NextResponse.json({ error: 'Title and Slug are required.' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { data: existing } = await supabase.from('custom_pages').select('id').eq('slug', slug).maybeSingle();
        if (existing) {
            return NextResponse.json({ error: 'Slug already exists.' }, { status: 400 });
        }

        const { data, error } = await supabase.from('custom_pages').insert({
            title,
            slug,
            is_campaign_page: !!is_campaign_page,
            status: 'draft'
        }).select().single();

        if (error) throw error;

        return NextResponse.json({ success: true, page: data });
    } catch (err) {
        console.error("Error creating page:", err);
        return NextResponse.json({ error: "Failed to create page." }, { status: 500 });
    }
});
