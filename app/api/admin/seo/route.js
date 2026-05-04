import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

// GET: Fetch all SEO overrides
export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('seo_overrides')
            .select('*')
            .order('route_path', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ overrides: (data || []).map((override) => ({ ...override, page_path: override.route_path })) });
    } catch (error) {
        console.error('API /admin/seo GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch SEO metadata overrides' }, { status: 500 });
    }
});

// PUT: Upsert an SEO override for a specific page path
export const PUT = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();

        const { page_path, meta_title, meta_description, canonical_url, robots_setting, og_image } = payload;
        if (!page_path) return NextResponse.json({ error: 'Missing page_path' }, { status: 400 });

        const updateKey = crypto
            .createHash('sha256')
            .update(JSON.stringify({ page_path, meta_title, meta_description, canonical_url, robots_setting, og_image }))
            .digest('hex');

        const { error } = await supabase.rpc('rule16_upsert_seo_override', {
            p_route_path: page_path,
            p_updates: { meta_title, meta_description, canonical_url, robots_setting, og_image },
            p_idempotency_key: updateKey,
        });

        if (error) throw error;

        const { data, error: refetchErr } = await supabase
            .from('seo_overrides')
            .select('*')
            .eq('route_path', page_path)
            .single();

        if (refetchErr) throw refetchErr;

        return NextResponse.json({ success: true, override: { ...data, page_path: data.route_path } });
    } catch (error) {
        console.error('API /admin/seo PUT error:', error);
        return NextResponse.json({ error: 'Failed to save SEO metadata override' }, { status: 500 });
    }
});
