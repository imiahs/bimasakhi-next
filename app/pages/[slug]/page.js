import React, { cache } from 'react';
import { unstable_cache, unstable_noStore as noStore } from 'next/cache';
import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getRobotsMetadata, getSeoMetadata } from '@/utils/seo';
import * as Blocks from '@/components/blocks/PageBlocks';
import { getBlockDefinition, normalizeBlockRecords } from '@/lib/blocks/registry';
import { getReusablePageRuntimeTag, REUSABLE_PAGE_RUNTIME_CACHE_KEY } from '@/lib/cms/reusablePageInvalidation';
import { logObs } from '@/lib/observability';
import FloatingApply from '@/components/ui/FloatingApply';
import FloatingWhatsApp from '@/components/ui/FloatingWhatsApp';
import PageTracker from '@/components/ui/PageTracker';

export const revalidate = 60;

async function getPageDataFromStore(slug, previewToken) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
        return null;
    }

    const supabase = getServiceSupabase();

    const pageQuery = supabase.from('custom_pages').select('*').eq('slug', slug);
    const { data: maybePage } = previewToken
        ? await pageQuery.maybeSingle()
        : await pageQuery.eq('status', 'published').maybeSingle();

    if (!maybePage) return null;

    if (previewToken && maybePage.status !== 'published') {
        if (!previewToken || previewToken !== `bimasakhi_admin_${maybePage.id}`) {
            await logObs('WARN', 'Reusable preview token rejected', 'system:runtime-economics', {
                route: '/pages/[slug]',
                slug,
                pageId: maybePage.id,
                pageStatus: maybePage.status,
                reason: 'invalid_preview_token',
            });
            return null; // Not published and invalid preview token
        }
    }

    const page = maybePage;

    const { data: blocks } = await supabase.from('page_blocks').select('*').eq('page_id', page.id).order('block_order', { ascending: true });

    return { page, blocks: blocks || [] };
}

const getPageDataFromStoreMemoized = cache(
    async (slug, previewToken) => getPageDataFromStore(slug, previewToken)
);

function getPublishedPageDataCached(slug) {
    return unstable_cache(
        async () => getPageDataFromStore(slug),
        [REUSABLE_PAGE_RUNTIME_CACHE_KEY, slug],
        {
            revalidate,
            tags: [getReusablePageRuntimeTag(slug)].filter(Boolean),
        }
    )();
}

async function getPageData(slug, previewToken) {
    if (previewToken) {
        noStore();
        return getPageDataFromStoreMemoized(slug, previewToken);
    }

    return getPublishedPageDataCached(slug);
}

function buildRuntimeConfidenceState(previewToken) {
    return {
        runtimeAuthority: 'reusable_public_runtime',
        runtimeTrust: 'runtime_truth_authoritative',
        renderMode: previewToken ? 'preview_no_store' : 'published_cache',
        cacheGovernance: previewToken ? 'preview_bypass' : `revalidate_${revalidate}s`,
        invalidationGovernance: previewToken ? 'preview_bypass_route_owned' : 'route_owned_save_time_tagged',
        replayWindowGovernance: previewToken ? 'preview_bypass' : `bounded_revalidate_${revalidate}s_with_save_time_invalidation`,
        previewIsolation: previewToken ? 'active' : 'not_requested',
        requestScopeGovernance: previewToken ? 'preview_request_scoped_memoized' : 'not_requested',
        normalizationMode: 'route_normalized_block_data',
        optimizationReversibility: 'bounded_and_reversible',
        confidenceSurface: previewToken ? 'PREVIEW_ISOLATED' : 'CACHE_SAFE',
    };
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

    const blocks = normalizeBlockRecords(data.blocks || []);
    const missingBlockTypes = [...new Set(
        blocks
            .filter((block) => !Blocks[block.block_type])
            .map((block) => block.block_type)
            .filter(Boolean)
    )];

    if (missingBlockTypes.length > 0) {
        await logObs('WARN', 'Reusable runtime skipped unknown block types', 'system:runtime-economics', {
            route: '/pages/[slug]',
            slug,
            pageId: data.page.id,
            renderMode: resolvedSearchParams?.preview_token ? 'preview_no_store' : 'published_cache',
            blockTypes: missingBlockTypes,
        });
    }

    const runtimeConfidenceState = buildRuntimeConfidenceState(resolvedSearchParams?.preview_token);

    // Async block parsing map into React nodes Server-side
    const renderBlocks = () => {
        return blocks.map((block) => {
            const definition = getBlockDefinition(block.block_type);
            const ComponentRender = Blocks[block.block_type];
            if (!ComponentRender) {
                return null;
            }

            return (
                <ComponentRender
                    key={block.id}
                    data={block.block_data}
                    normalizedData={block.block_data}
                    foundation={block.foundation}
                    blockDefinition={definition}
                />
            );
        });
    };

    return (
        <>
            <div
                hidden
                data-runtime-authority={runtimeConfidenceState.runtimeAuthority}
                data-runtime-trust={runtimeConfidenceState.runtimeTrust}
                data-render-mode={runtimeConfidenceState.renderMode}
                data-cache-governance={runtimeConfidenceState.cacheGovernance}
                data-invalidation-governance={runtimeConfidenceState.invalidationGovernance}
                data-replay-window-governance={runtimeConfidenceState.replayWindowGovernance}
                data-preview-isolation={runtimeConfidenceState.previewIsolation}
                data-request-scope-governance={runtimeConfidenceState.requestScopeGovernance}
                data-normalization-mode={runtimeConfidenceState.normalizationMode}
                data-optimization-reversibility={runtimeConfidenceState.optimizationReversibility}
                data-confidence-surface={runtimeConfidenceState.confidenceSurface}
            />
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
