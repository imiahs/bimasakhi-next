/**
 * /api/admin/locations/localities — List and create localities
 * Stage 5 fix (C12): Added POST for CEO to add localities from admin.
 * Bible: Section 5 (Geo + Intent Intelligence), Section 13 (Multi-City Micro-Local)
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

/**
 * POST /api/admin/locations/localities
 * Body: { city_id, locality_name, priority? }
 * Creates a new locality under the given city. Slug is auto-derived.
 */
export const POST = withAdminAuth(async (request) => {
    try {
        const body = await request.json();
        const { city_id, locality_name, priority = 3 } = body;

        if (!city_id) {
            return NextResponse.json({ success: false, error: 'city_id is required' }, { status: 400 });
        }
        if (!locality_name?.trim()) {
            return NextResponse.json({ success: false, error: 'locality_name is required' }, { status: 400 });
        }
        if (priority < 1 || priority > 5) {
            return NextResponse.json({ success: false, error: 'priority must be 1–5' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        // Verify city exists
        const { data: city } = await supabase
            .from('cities')
            .select('id, slug')
            .eq('id', city_id)
            .single();

        if (!city) {
            return NextResponse.json({ success: false, error: 'City not found' }, { status: 404 });
        }

        // Auto-derive slug: "Karol Bagh" → "karol-bagh"
        const localitySlug = locality_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const slug = `${city.slug}-${localitySlug}`;

        // Check slug uniqueness
        const { data: existing } = await supabase
            .from('localities')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existing) {
            return NextResponse.json({ success: false, error: `Locality with slug "${slug}" already exists` }, { status: 409 });
        }

        const { data, error } = await supabase
            .from('localities')
            .insert({
                city_id,
                locality_name: locality_name.trim(),
                slug,
                priority: parseInt(priority),
                active: true,
                has_page: false,
                pincode_count: 0,
            })
            .select()
            .single();

        if (error) {
            try { await supabase.from('observability_logs').insert({ level: 'ERROR', message: `Locality create failed: ${error.message}`, source: 'geo_localities_api', metadata: { locality_name, city_id, slug } }); } catch (_) {}
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Rule 9: Log success
        try { await supabase.from('observability_logs').insert({ level: 'INFO', message: `Locality created: "${locality_name}" under city ${city_id} (slug: ${slug})`, source: 'geo_localities_api', metadata: { id: data.id, locality_name, slug, priority: data.priority, city_id } }); } catch (_) {}

        return NextResponse.json({
            success: true,
            data,
            message: `Locality "${locality_name}" added under city successfully`,
        }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
