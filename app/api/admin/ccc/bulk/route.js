/**
 * /api/admin/ccc/bulk — Bulk Job Planner CRUD
 * 
 * Bible Reference: Phase 4, Section 10-12
 * GET: List all bulk generation jobs
 * POST: Create a new bulk generation job
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

// GET — List bulk jobs with stats
export const GET = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || '';

        let query = supabase
            .from('bulk_generation_jobs')
            .select('*')
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin', 'editor']);

// POST — Create a new bulk generation job
export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const body = await request.json();

        const {
            name,
            description,
            intent_type,
            scope,
            city_ids,
            locality_ids,
            base_keyword,
            keyword_variations,
            content_type,
            auto_approve_threshold,
            require_review_below,
            daily_publish_limit,
            generation_per_hour_cap,
        } = body;

        // Validate required fields
        if (!name || !intent_type || !base_keyword) {
            return NextResponse.json(
                { success: false, error: 'name, intent_type, and base_keyword are required' },
                { status: 400 }
            );
        }

        // Calculate total pages based on targeting
        let totalPages = 0;
        const selectedCityIds = Array.isArray(city_ids) ? city_ids : [];
        const selectedLocalityIds = Array.isArray(locality_ids) ? locality_ids : [];

        if (selectedLocalityIds.length > 0) {
            // Specific localities selected — count those
            totalPages = selectedLocalityIds.length;
        } else if (selectedCityIds.length > 0) {
            // Count localities in selected cities
            const { count } = await supabase
                .from('localities')
                .select('*', { count: 'exact', head: true })
                .in('city_id', selectedCityIds)
                .eq('active', true);
            totalPages = count || 0;
        } else {
            // All active localities
            const { count } = await supabase
                .from('localities')
                .select('*', { count: 'exact', head: true })
                .eq('active', true);
            totalPages = count || 0;
        }

        const { data, error } = await supabase
            .from('bulk_generation_jobs')
            .insert({
                name,
                description: description || null,
                intent_type,
                scope: scope || 'locality',
                city_ids: selectedCityIds,
                locality_ids: selectedLocalityIds,
                base_keyword,
                keyword_variations: keyword_variations || [],
                content_type: content_type || 'local_service',
                auto_approve_threshold: auto_approve_threshold ?? 8.0,
                require_review_below: require_review_below ?? 6.0,
                daily_publish_limit: Math.min(daily_publish_limit || 20, 100),
                generation_per_hour_cap: Math.min(generation_per_hour_cap || 50, 200),
                total_pages: totalPages,
                status: 'planned',
                created_by: user?.email || 'admin',
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Audit log (fire-and-forget)
        supabase.from('observability_logs').insert({
            level: 'INFO',
            message: `Bulk job created: "${name}" — ${totalPages} pages`,
            source: 'bulk_planner',
            metadata: { job_id: data.id, total_pages: totalPages, created_by: user?.email },
        }).then(() => {}).catch(() => {});

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
