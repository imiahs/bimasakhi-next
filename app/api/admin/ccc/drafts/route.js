import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

// GET /api/admin/ccc/drafts — List drafts with filters
export const GET = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);

        const status = searchParams.get('status') || '';
        const city = searchParams.get('city') || '';
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('content_drafts')
            .select('id, slug, page_title, hero_headline, meta_title, word_count, quality_score, status, review_notes, reviewer, reviewed_at, ai_model, city_id, locality_id, created_at, updated_at, published_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (city) {
            query = query.eq('city_id', city);
        }

        if (search) {
            query = query.or(`slug.ilike.%${search}%,hero_headline.ilike.%${search}%,meta_title.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('[CCC Drafts] Query error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            drafts: data || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (err) {
        console.error('[CCC Drafts] API error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});

// POST /api/admin/ccc/drafts — Create a blank draft (Fix 2c)
export const POST = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const body = await request.json();

        if (body.action !== 'create_blank') {
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }

        const slug = `new-page-${Date.now()}`;
        const { data, error } = await supabase
            .from('content_drafts')
            .insert({
                slug,
                page_title: 'New Page',
                hero_headline: 'New Page',
                meta_title: '',
                meta_description: '',
                body_content: '',
                status: 'draft',
                word_count: 0,
                ai_model: 'manual',
            })
            .select('id, slug')
            .single();

        if (error) {
            console.error('[CCC Drafts] Create error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, draft: data });
    } catch (err) {
        console.error('[CCC Drafts] POST error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});
