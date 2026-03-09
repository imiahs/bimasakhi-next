import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// API feeding the Internal Link Block natively executing Orphan detections internally
export async function GET(req) {
    if (process.env.SUPABASE_ENABLED !== 'true') {
        return NextResponse.json({ links: [] });
    }

    const { searchParams } = new URL(req.url);
    const localityId = searchParams.get('localityId');
    const cityId = searchParams.get('cityId');
    const pageIndexId = searchParams.get('pageIndexId'); // the page making the request

    let links = [];

    try {
        if (!localityId || !cityId) return NextResponse.json({ links });

        // Fetch 3 related localities inside the same city, skipping our own locality
        const { data: peerPages } = await supabase
            .from('page_index')
            .select('page_slug, page_type')
            .eq('city_id', cityId)
            .neq('locality_id', localityId)
            .eq('status', 'active')
            .eq('page_type', 'locality_page')
            .limit(3);

        if (peerPages) {
            links = peerPages.map(p => ({
                slug: p.page_slug,
                anchor: `LIC Agent Career in ${p.page_slug.replace('bima-sakhi-', '').replace(/-/g, ' ')}`
            }));
        }

        // Add parent City link specifically
        const { data: cityPage } = await supabase
            .from('page_index')
            .select('page_slug')
            .eq('city_id', cityId)
            .eq('page_type', 'city_page')
            .eq('status', 'active')
            .limit(1)
            .single();

        if (cityPage) {
            links.unshift({
                slug: cityPage.page_slug,
                anchor: `View All Bima Sakhi Programs in ${cityPage.page_slug.replace('bima-sakhi-', '')}`
            });
        }

        // Add 2 Top Converting Pages (high priority crawl budget winners)
        const { data: topPages } = await supabase
            .from('page_index')
            .select('page_slug')
            .eq('status', 'active')
            .eq('crawl_priority', 'high')
            .order('crawl_score', { ascending: false })
            .limit(2);

        if (topPages) {
            topPages.forEach(tp => {
                if (tp.page_slug !== cityPage?.page_slug) {
                    links.push({
                        slug: tp.page_slug,
                        anchor: `Trending Opportunity: ${tp.page_slug.replace('bima-sakhi-', '').replace(/-/g, ' ')}`
                    });
                }
            });
        }

        // Feature: Orphan Graph Tracking / Quality Boost (If no peers exist, log an orphan alert natively)
        if (links.length === 0 && pageIndexId) {
            // We do an upsert or single insert alerting to Orphan node via seo_growth
            setTimeout(async () => {
                await supabase.from('seo_growth_recommendations').insert({
                    recommendation_type: 'orphan_page_detection',
                    target_data: { page_index_id: pageIndexId },
                    ai_rationale: 'Subpage resolved 0 valid internal adjacent links indicating isolated spider traps.',
                    status: 'pending'
                });
            }, 100);
        }

        return NextResponse.json({ links });
    } catch (e) {
        console.error("Internal Graph API Error:", e);
        return NextResponse.json({ links: [] }, { status: 500 });
    }
}
