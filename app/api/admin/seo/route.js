import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';

// GET: Fetch all SEO overrides
export async function GET() {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('seo_overrides')
            .select('*')
            .order('page_path', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ overrides: data });
    } catch (error) {
        console.error('API /admin/seo GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch SEO metadata overrides' }, { status: 500 });
    }
}

// PUT: Upsert an SEO override for a specific page path
export async function PUT(request) {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();

        const { page_path, meta_title, meta_description, og_image } = payload;
        if (!page_path) return NextResponse.json({ error: 'Missing page_path' }, { status: 400 });

        // Check if exists
        const { data: existing } = await supabase
            .from('seo_overrides')
            .select('id')
            .eq('page_path', page_path)
            .single();

        let result;
        if (existing) {
            // Phase 18: Data Versioning Hook (Snapshot before update)
            const { data: currentSeo, error: fetchErr } = await supabase
                .from('seo_overrides')
                .select('*')
                .eq('id', existing.id)
                .single();

            if (!fetchErr && currentSeo) {
                await supabase.from('seo_versions').insert({
                    seo_id: currentSeo.id,
                    route: currentSeo.page_path,
                    title: currentSeo.meta_title || '',
                    description: currentSeo.meta_description || '',
                    og_title: currentSeo.meta_title || '',
                    og_description: currentSeo.meta_description || '',
                    keywords: ''
                });
            }

            result = await supabase
                .from('seo_overrides')
                .update({ meta_title, meta_description, og_image })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('seo_overrides')
                .insert({ page_path, meta_title, meta_description, og_image })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        return NextResponse.json({ success: true, override: result.data });
    } catch (error) {
        console.error('API /admin/seo PUT error:', error);
        return NextResponse.json({ error: 'Failed to save SEO metadata override' }, { status: 500 });
    }
}
