/**
 * /api/admin/locations/cities — List and create cities
 * Stage 5 fix (C12): Added POST for CEO to add new cities from admin.
 * Bible: Section 5 (Geo + Intent Intelligence), Section 44 (Geo Control)
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('cities')
            .select('id, city_name, slug, population, active, state')
            .order('city_name', { ascending: true });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin', 'editor']);

/**
 * POST /api/admin/locations/cities
 * Body: { city_name, state, population?, active? }
 * Creates a new city. Slug is auto-derived from city_name.
 */
export const POST = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const { city_name, state, population, active = true } = body;

        if (!city_name?.trim()) {
            return NextResponse.json({ success: false, error: 'city_name is required' }, { status: 400 });
        }
        if (!state?.trim()) {
            return NextResponse.json({ success: false, error: 'state is required' }, { status: 400 });
        }

        // Auto-derive slug: "New Delhi" → "new-delhi"
        const slug = city_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        const supabase = getServiceSupabase();

        // Check slug uniqueness
        const { data: existing } = await supabase
            .from('cities')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existing) {
            return NextResponse.json({ success: false, error: `City with slug "${slug}" already exists` }, { status: 409 });
        }

        const { data, error } = await supabase
            .from('cities')
            .insert({
                city_name: city_name.trim(),
                slug,
                state: state.trim(),
                population: population ? parseInt(population) : null,
                active,
            })
            .select()
            .single();

        if (error) {
            try { await supabase.from('observability_logs').insert({ level: 'ERROR', message: `City create failed: ${error.message}`, source: 'geo_cities_api', metadata: { city_name, slug } }); } catch (_) {}
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Rule 9: Log success
        try { await supabase.from('observability_logs').insert({ level: 'INFO', message: `City created: "${city_name}" (slug: ${slug})`, source: 'geo_cities_api', metadata: { id: data.id, city_name, slug, state: data.state } }); } catch (_) {}

        return NextResponse.json({ success: true, data, message: `City "${city_name}" created successfully` }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
