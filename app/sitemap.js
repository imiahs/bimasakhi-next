import { getServiceSupabase } from '@/utils/supabase';
import { logError } from '@/lib/monitoring/logError';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
    const baseUrl = 'https://bimasakhi.com';
    const lastModified = new Date().toISOString();

    const staticPages = [
        { url: baseUrl, lastModified, changeFrequency: 'weekly', priority: 1.0 },
        { url: `${baseUrl}/why`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${baseUrl}/income`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${baseUrl}/eligibility`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${baseUrl}/apply`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${baseUrl}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/tools`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/resources`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/tools/lic-income-calculator`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/tools/lic-commission-calculator`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/contact`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/downloads`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/bima-sakhi-delhi`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    ];

    let dynamicPages = [];
    try {
        const supabase = getServiceSupabase();

        // Fetch blog posts
        const { data: posts } = await supabase.from('blog_posts').select('slug, created_at, status');
        if (posts) {
            posts.forEach(post => {
                if (post.status !== 'draft') {
                    dynamicPages.push({
                        url: `${baseUrl}/blog/${post.slug}`,
                        lastModified: new Date(post.created_at || lastModified).toISOString(),
                        changeFrequency: 'weekly',
                        priority: 0.7,
                    });
                }
            });
        }

        // Fetch custom pages
        const { data: cPages } = await supabase.from('custom_pages').select('slug, updated_at, status');
        if (cPages) {
            cPages.forEach(page => {
                if (page.status === 'published') {
                    dynamicPages.push({
                        url: `${baseUrl}/${page.slug}`,
                        lastModified: new Date(page.updated_at || lastModified).toISOString(),
                        changeFrequency: 'weekly',
                        priority: 0.8,
                    });
                }
            });
        }

        // Phase 30: SEO Index Drip limit
        // Gradually push programmatic location pages into sitemap avoiding bulk index penalties
        const { data: locPages } = await supabase.from('page_index')
            .select('page_slug, created_at')
            .neq('status', 'draft')
            .order('created_at', { ascending: false })
            .limit(100); // 100 pages rolling drip limit
        
        if (locPages) {
            locPages.forEach(page => {
                dynamicPages.push({
                    url: `${baseUrl}/${page.page_slug}`,
                    lastModified: new Date(page.created_at || lastModified).toISOString(),
                    changeFrequency: 'weekly',
                    priority: 0.7,
                });
            });
        }
    } catch (e) {
        logError('SEO_Engine', "Sitemap generation error", e);
    }

    return [...staticPages, ...dynamicPages];
}
