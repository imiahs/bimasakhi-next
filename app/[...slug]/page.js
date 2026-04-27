import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import GeneratedPageTemplate from '@/components/layout/GeneratedPageTemplate';

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

async function getGeneratedPage(slugArray) {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  // Join slug segments: ['lic-agent', 'delhi', 'krishna-nagar'] → 'lic-agent/delhi/krishna-nagar'
  // Also try the flat version: 'lic-agent-delhi-krishna-nagar' (how pagegen currently stores slugs)
  const joinedSlug = slugArray.join('/');
  const flatSlug = slugArray.join('-');

  // Try joined slug first, then flat slug
  let pageRes = await supabase
    .from('page_index')
    .select('id, page_slug, page_type, status, city_id, locality_id')
    .eq('page_slug', joinedSlug)
    .eq('status', 'published')
    .maybeSingle();

  if (!pageRes.data && joinedSlug !== flatSlug) {
    pageRes = await supabase
      .from('page_index')
      .select('id, page_slug, page_type, status, city_id, locality_id')
      .eq('page_slug', flatSlug)
      .eq('status', 'published')
      .maybeSingle();
  }

  if (pageRes.error || !pageRes.data) return null;

  const page = pageRes.data;

  // Get the content
  const { data: content, error: contentError } = await supabase
    .from('location_content')
    .select('hero_headline, local_opportunity_description, faq_data, cta_text, meta_title, meta_description, word_count, city_id, locality_id')
    .eq('page_index_id', page.id)
    .maybeSingle();

  if (contentError || !content) return null;

  // Get sibling pages from same city (for internal linking)
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

  if (!result) {
    return { title: 'Page Not Found | Bima Sakhi' };
  }

  const { page, content } = result;
  const title = content.meta_title || `${page.page_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} | Bima Sakhi`;
  const description = content.meta_description || 'Bima Sakhi — Women empowerment through financial independence.';
  const canonicalUrl = `https://bimasakhi.com/${page.page_slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
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
  };
}

// --- Page Component ---

export default async function GeneratedCatchAllPage({ params }) {
  const { slug } = await params;
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const result = await getGeneratedPage(slugArray);

  if (!result) {
    notFound();
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
