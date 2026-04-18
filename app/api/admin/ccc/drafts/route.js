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
