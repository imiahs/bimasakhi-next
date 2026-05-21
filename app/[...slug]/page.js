import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getRobotsMetadata, getSeoMetadata } from '@/utils/seo';
import GeneratedPageTemplate from '@/components/layout/GeneratedPageTemplate';
import { getFeatureFlag } from '@/lib/featureFlags';
import * as Blocks from '@/components/blocks/PageBlocks';
import FloatingApply from '@/components/ui/FloatingApply';
import FloatingWhatsApp from '@/components/ui/FloatingWhatsApp';
import PageTracker from '@/components/ui/PageTracker';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Catch-all route for AI-generated pages.
 * 
 * WHY: Pagegen worker writes to page_index + location_content, but no route
 * was reading from these tables. This catch-all closes the "rendering gap"
 * (Section 3 of CONTENT_COMMAND_CENTER.md).
 * 
 * PRIORITY: Next.js explicit folder routes (/about, /admin, /blog, etc.) always
 * take priority over this catch-all. This only fires when no other route matches.
 * 
 * FALLBACK: If no page found in page_index → notFound() → standard 404.
 */

async function getGeneratedPageContent(supabase, page) {
  const { data: content, error: contentError } = await supabase
    .from('location_content')
    .select('hero_headline, local_opportunity_description, faq_data, cta_text, meta_title, meta_description, word_count, city_id, locality_id')
    .eq('page_index_id', page.id)
    .maybeSingle();

  if (contentError || !content) return null;

  let siblings = [];
  if (page.city_id) {
    const { data: siblingData } = await supabase
      .from('page_index')
      .select('page_slug')
      .eq('city_id', page.city_id)
      .eq('status', 'published')
      .neq('id', page.id)
      .limit(6);

    siblings = siblingData || [];
  }

  return { page, content, siblings };
}

async function getCustomPageContent(supabase, page) {
  const { data: blocks, error: blocksError } = await supabase
    .from('page_blocks')
    .select('*')
    .eq('page_id', page.id)
    .order('block_order', { ascending: true });

  if (blocksError) return null;

  return { page, blocks: blocks || [], contentType: 'custom_page' };
}

function normalizeSegments(slugSegments) {
  if (Array.isArray(slugSegments)) {
    return slugSegments
      .flatMap((segment) => String(segment || '').split('/'))
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  return String(slugSegments || '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildShadowCandidates(slugSegments) {
  const segments = normalizeSegments(slugSegments);
  const requestedPath = segments.join('/');
  const flatPath = segments.join('-');
  const customPath = requestedPath.startsWith('pages/')
    ? requestedPath.slice('pages/'.length)
    : requestedPath;

  return {
    requestedPath,
    pageIndexCandidates: uniqueValues([requestedPath, flatPath]),
    customPageCandidates: uniqueValues([requestedPath, customPath]),
  };
}

async function maybeSingle(query) {
  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function resolveShadowRecord(supabase, slugArray) {
  const candidates = buildShadowCandidates(slugArray);

  if (!candidates.requestedPath) {
    return null;
  }

  const pageIndexSelect = 'id, page_slug, full_slug, page_type, content_type, status, city_id, locality_id, canonical_url, robots_setting';
  const customPageSelect = 'id, slug, title, status, is_campaign_page, parent_id, full_slug, page_type, canonical_url, robots_setting, meta_title, meta_description';

  const pageByFullSlug = await maybeSingle(
    supabase
      .from('page_index')
      .select(pageIndexSelect)
      .eq('full_slug', candidates.requestedPath)
      .eq('status', 'published')
  );

  if (pageByFullSlug) {
    return { source: 'page_index', record: pageByFullSlug };
  }

  for (const pageSlug of candidates.pageIndexCandidates) {
    const pageMatch = await maybeSingle(
      supabase
        .from('page_index')
        .select(pageIndexSelect)
        .eq('page_slug', pageSlug)
        .eq('status', 'published')
    );

    if (pageMatch) {
      return { source: 'page_index', record: pageMatch };
    }
  }

  for (const fullSlug of candidates.customPageCandidates) {
    const customPageByFullSlug = await maybeSingle(
      supabase
        .from('custom_pages')
        .select(customPageSelect)
        .eq('full_slug', fullSlug)
        .eq('status', 'published')
    );

    if (customPageByFullSlug) {
      return { source: 'custom_pages', record: customPageByFullSlug };
    }
  }

  for (const slug of candidates.customPageCandidates) {
    const customPageBySlug = await maybeSingle(
      supabase
        .from('custom_pages')
        .select(customPageSelect)
        .eq('slug', slug)
        .eq('status', 'published')
    );

    if (customPageBySlug) {
      return { source: 'custom_pages', record: customPageBySlug };
    }
  }

  return null;
}

async function getGeneratedPageCurrent(slugArray, supabase) {

  // Join slug segments: ['lic-agent', 'delhi', 'krishna-nagar'] → 'lic-agent/delhi/krishna-nagar'
  // Also try the flat version: 'lic-agent-delhi-krishna-nagar' (how pagegen currently stores slugs)
  const joinedSlug = slugArray.join('/');
  const flatSlug = slugArray.join('-');

  // Try joined slug first, then flat slug
  let pageRes = await supabase
    .from('page_index')
    .select('id, page_slug, full_slug, page_type, content_type, status, city_id, locality_id, canonical_url, robots_setting')
    .eq('page_slug', joinedSlug)
    .eq('status', 'published')
    .maybeSingle();

  if (!pageRes.data && joinedSlug !== flatSlug) {
    pageRes = await supabase
      .from('page_index')
      .select('id, page_slug, full_slug, page_type, content_type, status, city_id, locality_id, canonical_url, robots_setting')
      .eq('page_slug', flatSlug)
      .eq('status', 'published')
      .maybeSingle();
  }

  if (pageRes.error || !pageRes.data) return null;

  const page = pageRes.data;

  return getGeneratedPageContent(supabase, page);
}

async function getGeneratedPageShadow(slugArray, supabase) {
  const resolution = await resolveShadowRecord(supabase, slugArray);

  if (!resolution?.record?.id) {
    return null;
  }

  if (resolution.source === 'custom_pages') {
    return getCustomPageContent(supabase, resolution.record);
  }

  if (resolution.source !== 'page_index') {
    return null;
  }

  const page = {
    id: resolution.record.id,
    page_slug: resolution.record.page_slug,
    full_slug: resolution.record.full_slug,
    page_type: resolution.record.page_type,
    content_type: resolution.record.content_type,
    status: resolution.record.status,
    city_id: resolution.record.city_id,
    locality_id: resolution.record.locality_id,
    canonical_url: resolution.record.canonical_url,
    robots_setting: resolution.record.robots_setting,
  };

  return getGeneratedPageContent(supabase, page);
}

async function getGeneratedPage(slugArray) {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const useUnifiedResolver = await getFeatureFlag('cms_unified_resolver_enabled');
  const path = slugArray.join('/');

  if (useUnifiedResolver) {
    try {
      const unifiedResult = await getGeneratedPageShadow(slugArray, supabase);
      if (unifiedResult) {
        return unifiedResult;
      }
    } catch (error) {
      console.error('[CMS Resolver] mode=unified-error source=page_index path=%s error=%s', path, error?.message || String(error));
    }
  }

  return getGeneratedPageCurrent(slugArray, supabase);
}

function renderCustomBlocks(blocks) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="text-center py-32 text-slate-500">
        Content is currently being assembled for this route.
      </div>
    );
  }

  return blocks.map((block) => {
    const ComponentRender = Blocks[block.block_type];
    if (!ComponentRender) return null;
    return <ComponentRender key={block.id} data={block.block_data} />;
  });
}

// --- Schema Markup (Phase 1d) ---

function buildFAQSchema(faqData) {
  if (!Array.isArray(faqData) || faqData.length === 0) return null;

  const mainEntity = faqData
    .filter(faq => (faq.question || faq.name) && (faq.answer || faq.acceptedAnswer?.text || faq.text))
    .map(faq => ({
      '@type': 'Question',
      name: faq.question || faq.name,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer || faq.acceptedAnswer?.text || faq.text,
      },
    }));

  if (mainEntity.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

function buildBreadcrumbSchema(slug) {
  const parts = slug.split(/[/-]/).filter(Boolean);
  // Build a simple breadcrumb: Home → page
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bimasakhi.com' },
    {
      '@type': 'ListItem',
      position: 2,
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      item: `https://bimasakhi.com/${slug}`,
    },
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

// --- generateMetadata (Phase 1c) ---

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const result = await getGeneratedPage(slugArray);
  const routePath = `/${normalizeSegments(slugArray).join('/')}`;

  if (!result) {
    return { title: 'Page Not Found | Bima Sakhi' };
  }

  if (result.contentType === 'custom_page') {
    const title = result.page.meta_title || `${result.page.title} | Bima Sakhi`;
    const description = result.page.meta_description || 'Empowering women via insurance networks.';
    const canonicalUrl = result.page.canonical_url || `https://bimasakhi.com${routePath}`;

    return getSeoMetadata(routePath, {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      robots: getRobotsMetadata(result.page.robots_setting),
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

  const { page, content } = result;
  const title = content.meta_title || `${page.page_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} | Bima Sakhi`;
  const description = content.meta_description || 'Bima Sakhi — Women empowerment through financial independence.';
  const canonicalUrl = page.canonical_url || `https://bimasakhi.com${routePath}`;

  return getSeoMetadata(routePath, {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: getRobotsMetadata(page.robots_setting),
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

// --- Page Component ---

export default async function GeneratedCatchAllPage({ params }) {
  const { slug } = await params;
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const result = await getGeneratedPage(slugArray);

  if (!result) {
    notFound();
  }

  if (result.contentType === 'custom_page') {
    const { page, blocks } = result;

    return (
      <>
        <div className="min-h-screen bg-slate-50 pt-24">
          {renderCustomBlocks(blocks)}
        </div>
        <FloatingApply />
        <FloatingWhatsApp />
        <PageTracker pageId={page.id} />
      </>
    );
  }

  const { page, content, siblings } = result;

  // Build JSON-LD schemas
  const faqSchema = buildFAQSchema(content.faq_data);
  const breadcrumbSchema = buildBreadcrumbSchema(page.page_slug);

  return (
    <>
      {/* JSON-LD Schema Markup (Phase 1d) */}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <GeneratedPageTemplate
        page={page}
        content={content}
        siblings={siblings}
      />
    </>
  );
}
