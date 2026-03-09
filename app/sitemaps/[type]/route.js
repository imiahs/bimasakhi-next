import { supabase } from '@/lib/supabase';

// This handles dynamic resolution for /sitemaps/sitemap-localities-[1].xml
export async function GET(request, { params }) {
    const { type } = params;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (process.env.SUPABASE_ENABLED !== 'true') {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }

    let urls = [];

    try {
        if (type === 'sitemap-core.xml') {
            urls = [
                { loc: `${siteUrl}/`, changefreq: 'daily', priority: 1.0 },
                { loc: `${siteUrl}/tools`, changefreq: 'weekly', priority: 0.8 },
                { loc: `${siteUrl}/blog`, changefreq: 'daily', priority: 0.9 },
                { loc: `${siteUrl}/about`, changefreq: 'monthly', priority: 0.6 }
            ];
        }
        else if (type.startsWith('sitemap-localities-')) {
            // Decode pagination (e.g. sitemap-localities-2.xml -> offset 1000)
            const parts = type.split('-');
            const pageIndexRaw = parts[parts.length - 1].replace('.xml', '');
            const pageNum = parseInt(pageIndexRaw, 10);

            if (!isNaN(pageNum) && pageNum > 0) {
                const limit = 1000;
                const start = (pageNum - 1) * limit;
                const end = start + limit - 1;

                const { data: pageRange } = await supabase
                    .from('page_index')
                    .select('page_slug, crawl_priority, updated_at')
                    .eq('status', 'active')
                    .order('crawl_priority', { ascending: true }) // Ranks cities highest natively
                    .range(start, end);

                if (pageRange) {
                    urls = pageRange.map(page => ({
                        loc: `${siteUrl}/${page.page_slug}`,
                        lastmod: page.updated_at || new Date().toISOString(),
                        changefreq: page.crawl_priority === 'city_page' ? 'daily' : 'weekly',
                        priority: page.crawl_priority === 'city_page' ? 0.9 : 0.7
                    }));
                }
            }
        }
        else if (type === 'sitemap-keywords-latest.xml') {
            // Discovery engine pushing ONLY newly active urls 
            // Emulating finding the freshest latest 'active' promotions.
            const { data: recentPages } = await supabase
                .from('page_index')
                .select('page_slug, updated_at')
                .eq('status', 'active')
                .order('updated_at', { ascending: false })
                .limit(200);

            if (recentPages) {
                urls = recentPages.map(page => ({
                    loc: `${siteUrl}/${page.page_slug}`,
                    lastmod: page.updated_at || new Date().toISOString(),
                    changefreq: 'daily',
                    priority: 0.8
                }));
            }
        }

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        for (const u of urls) {
            xml += `
  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    ${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}
    ${u.priority ? `<priority>${u.priority}</priority>` : ''}
  </url>`;
        }

        xml += `\n</urlset>`;

        return new Response(xml, {
            status: 200,
            headers: {
                'Content-Type': 'text/xml',
                // Cached mapping explicitly to limit DB hits on mass crawls
                'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200'
            }
        });
    } catch (err) {
        return new Response('<error>Shard generation failure</error>', { status: 500 });
    }
}
