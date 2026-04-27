import { getSiteUrl } from '@/lib/siteUrl';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// High Performance Sitemap Index Aggregator
export async function GET() {
    const siteUrl = getSiteUrl();

    if (!supabase) {
        return new Response(
            `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>`,
            { status: 200, headers: { 'Content-Type': 'text/xml' } }
        );
    }

    try {
        // Fetch optimal counts to batch sitemaps per 2000 limit limit
        const { count, error } = await supabase
            .from('page_index')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published');

        const activePagesCount = count || 0;
        const SHARD_LIMIT = 2000;
        const totalShards = Math.ceil(activePagesCount / SHARD_LIMIT) || 1;

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/sitemaps/sitemap-core.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemaps/sitemap-keywords-latest.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;

        // Dynamically inject the pagination bounds 
        for (let i = 1; i <= totalShards; i++) {
            xml += `
  <sitemap>
    <loc>${siteUrl}/sitemaps/sitemap-localities-${i}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
        }

        xml += `\n</sitemapindex>`;

        return new Response(xml, {
            status: 200,
            headers: {
                'Content-Type': 'text/xml',
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (e) {
        console.error("Sitemap Index generation failed", e);
        return new Response('<error>Sitemap limit fault</error>', { status: 500 });
    }
}
