/**
 * /api/admin/locations/coverage — Geo coverage dashboard stats
 * Bible: Section 13 (Multi-City + Pincode Micro-Local Engine)
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
    try {
        const supabase = getServiceSupabase();

        // City-level coverage with locality counts
        const { data: cities, error: citiesErr } = await supabase
            .from('cities')
            .select('id, city_name, slug, state, population, active, locality_count, page_count, coverage_pct')
            .eq('active', true)
            .order('population', { ascending: false });

        if (citiesErr) {
            return NextResponse.json({ success: false, error: citiesErr.message }, { status: 500 });
        }

        // Total counts
        const { count: totalLocalities } = await supabase
            .from('localities')
            .select('id', { count: 'exact', head: true });

        const { count: activeLocalities } = await supabase
            .from('localities')
            .select('id', { count: 'exact', head: true })
            .eq('active', true);

        const { count: totalPincodes } = await supabase
            .from('pincodes')
            .select('id', { count: 'exact', head: true });

        const { count: totalPages } = await supabase
            .from('page_index')
            .select('id', { count: 'exact', head: true });

        const { count: activePages } = await supabase
            .from('page_index')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active');

        // Localities with pages vs without
        const { count: localitiesWithPages } = await supabase
            .from('localities')
            .select('id', { count: 'exact', head: true })
            .eq('has_page', true);

        // Expansion potential: active localities without pages
        const { data: expansionTargets } = await supabase
            .from('localities')
            .select('id, locality_name, slug, priority, cities!inner(city_name, slug)')
            .eq('active', true)
            .eq('has_page', false)
            .order('priority', { ascending: true })
            .limit(20);

        return NextResponse.json({
            success: true,
            summary: {
                total_cities: cities?.length || 0,
                total_localities: totalLocalities || 0,
                active_localities: activeLocalities || 0,
                total_pincodes: totalPincodes || 0,
                total_pages: totalPages || 0,
                active_pages: activePages || 0,
                localities_with_pages: localitiesWithPages || 0,
                overall_coverage_pct: activeLocalities > 0
                    ? Math.round(((localitiesWithPages || 0) / activeLocalities) * 100)
                    : 0
            },
            cities,
            expansion_targets: expansionTargets || []
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin', 'editor']);
