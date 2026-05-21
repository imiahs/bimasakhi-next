import React from 'react';
import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getRobotsMetadata, getSeoMetadata } from '@/utils/seo';
import * as Blocks from '@/components/blocks/PageBlocks';
import FloatingApply from '@/components/ui/FloatingApply';
import FloatingWhatsApp from '@/components/ui/FloatingWhatsApp';
import PageTracker from '@/components/ui/PageTracker';

export const revalidate = 60;

// Fetch Page Data function
async function getPageData(slug, previewToken) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
        return null;
    }

    const supabase = getServiceSupabase();

    // Fetch page bypassing published strictly, check below
    const { data: maybePage } = await supabase.from('custom_pages').select('*').eq('slug', slug).maybeSingle();

    if (!maybePage) return null;

    if (maybePage.status !== 'published') {
        if (!previewToken || previewToken !== `bimasakhi_admin_${maybePage.id}`) {
            return null; // Not published and invalid preview token
        }
    }

    const page = maybePage;

    const { data: blocks } = await supabase.from('page_blocks').select('*').eq('page_id', page.id).order('block_order', { ascending: true });

    return { page, blocks: blocks || [] };
}

export async function generateMetadata({ params, searchParams }) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
    const data = await getPageData(slug, resolvedSearchParams?.preview_token);

    if (!data) return { title: 'Page Not Found | Bima Sakhi' };

    const title = data.page.meta_title || `${data.page.title} | Bima Sakhi`;
    const description = data.page.meta_description || 'Empowering women via insurance networks.';
    const canonicalUrl = data.page.canonical_url || `https://bimasakhi.com/pages/${slug}`;

    return getSeoMetadata(`/pages/${slug}`, {
        title,
        description,
        alternates: {
            canonical: canonicalUrl,
        },
        robots: getRobotsMetadata(data.page.robots_setting),
        openGraph: {
            title,
            description,
            url: canonicalUrl,
            type: 'website',
            siteName: 'Bima Sakhi',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    });
}

export default async function DynamicCMSPage({ params, searchParams }) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
    const data = await getPageData(slug, resolvedSearchParams?.preview_token);

    if (!data) {
        notFound();
    }

    const { blocks } = data;

    // Async block parsing map into React nodes Server-side
    const renderBlocks = () => {
        return blocks.map((block) => {
            const ComponentRender = Blocks[block.block_type];
            if (!ComponentRender) {
                console.warn(`Block type requested [${block.block_type}] does not exist in library.`);
                return null;
            }
            return <ComponentRender key={block.id} data={block.block_data} />;
        });
    };

    return (
        <>
            <div className="min-h-screen bg-slate-50 pt-24">
                {blocks.length > 0 ? (
                    renderBlocks()
                ) : (
                    <div className="text-center py-32 text-slate-500">
                        Content is currently being assembled for this route.
                    </div>
                )}
            </div>
            <FloatingApply />
            <FloatingWhatsApp />
            <PageTracker pageId={data.page.id} />
        </>
    );
}
