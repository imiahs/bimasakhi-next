import { getSiteUrl } from '@/lib/siteUrl';
import { supabase } from '@/lib/supabase';

// This acts as the Sitemap Index root mapping to distinct 1000-page XML shards natively
export async function GET() {
    const siteUrl = getSiteUrl();

    if (process.env.SUPABASE_ENABLED !== 'true') {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>`, {
            status: 200,
            headers: { 'Content-Type': 'text/xml' }
        });
    }

    try {
        const { count: activeCount } = await supabase
            .from('page_index')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active');

        // Default fallback if error
        const totalPages = activeCount || 0;
        const shardCount = Math.ceil(totalPages / 1000) || 1;

        // Build the Index XML string
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        // 1. Static/Core pages sitemap
        xml += `
  <sitemap>
    <loc>${siteUrl}/sitemaps/sitemap-core.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;

        // 2. Dynamic Discovery Localities sitemaps (Sharded by 1000)
        for (let i = 1; i <= shardCount; i++) {
            xml += `
  <sitemap>
    <loc>${siteUrl}/sitemaps/sitemap-localities-${i}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
        }

        // 3. Latest Keywords (Google Discovery optimization)
        xml += `
  <sitemap>
    <loc>${siteUrl}/sitemaps/sitemap-keywords-latest.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;

        xml += `\n</sitemapindex>`;

        return new Response(xml, {
            status: 200,
            headers: {
                'Content-Type': 'text/xml',
                'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200'
            }
        });
    } catch (err) {
        return new Response('<error>Internal generator error</error>', { status: 500 });
    }
}
