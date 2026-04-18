/**
 * /api/admin/locations/localities — List localities for a city with coverage stats
 * Bible: Section 13 (Multi-City + Pincode Micro-Local Engine)
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request) => {
    try {
        const { searchParams } = new URL(request.url);
        const cityId = searchParams.get('city_id');
        const activeOnly = searchParams.get('active') !== 'false';

        if (!cityId) {
            return NextResponse.json({ success: false, error: 'city_id required' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        let query = supabase
            .from('localities')
            .select('id, locality_name, slug, priority, active, has_page, page_slug, pincode_count, created_at')
            .eq('city_id', cityId)
            .order('priority', { ascending: true })
            .order('locality_name', { ascending: true });

        if (activeOnly) {
            query = query.eq('active', true);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Get page coverage stats
        const total = data?.length || 0;
        const withPages = data?.filter(l => l.has_page).length || 0;

        return NextResponse.json({
            success: true,
            data,
            stats: {
                total,
                with_pages: withPages,
                without_pages: total - withPages,
                coverage_pct: total > 0 ? Math.round((withPages / total) * 100) : 0
            }
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin', 'editor']);
