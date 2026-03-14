import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const maxDuration = 300;

export async function POST(request) {
    const startTime = Date.now();
    const upstashMessageId = request.headers.get('upstash-message-id') || `manual-${Date.now()}`;
    const upstashRetryCount = request.headers.get('upstash-retried') || '0';
    
    const supabase = getServiceSupabase();
    let successStatus = false;
    let errorMessage = null;
    let processedPages = 0;

    try {
        const { data: scores, error: fetchError } = await supabase
            .from('page_quality_scores')
            .select(`
                page_index_id,
                traffic_score,
                conversion_score,
                engagement_score,
                seo_score,
                page_index ( id, status, path, created_at, internal_links_count )
            `);

        if (fetchError) throw fetchError;

        if (scores && scores.length > 0) {
            for (const row of scores) {
                const page = row.page_index;
                if (!page) continue;

                // Compute Weighted Crawl Score
                const crawlScore = Math.round(
                    (row.traffic_score * 0.35) +
                    (row.conversion_score * 0.30) +
                    (row.engagement_score * 0.20) +
                    (row.seo_score * 0.15)
                );

                // Compute Priority
                let priority = 'medium';
                if (crawlScore > 80) priority = 'high';
                else if (crawlScore < 40) priority = 'low';

                let status = page.status;
                const pageAgeDays = (Date.now() - new Date(page.created_at).getTime()) / (1000 * 60 * 60 * 24);

                if (row.traffic_score === 0 && row.engagement_score === 0 && pageAgeDays > 60 && status === 'active') {
                    status = 'noindex';
                }

                await supabase.from('page_index')
                    .update({
                        crawl_score: crawlScore,
                        crawl_priority: priority,
                        status: status
                    })
                    .eq('id', page.id);

                if (page.internal_links_count === 0 && status !== 'noindex') {
                    const pathParts = page.path?.split('/').filter(Boolean) || [];
                    if (pathParts.length > 1) {
                        const { data: existingRec } = await supabase
                            .from('seo_growth_recommendations')
                            .select('id')
                            .eq('page_index_id', page.id)
                            .eq('recommendation_type', 'ORPHAN_PAGE')
                            .single();

                        if (!existingRec) {
                            await supabase.from('seo_growth_recommendations').insert({
                                page_index_id: page.id,
                                recommendation_type: 'ORPHAN_PAGE',
                                details: `Page ${page.path} has 0 internal links and is orphaned from the hierarchy graph.`
                            });
                        }
                    }
                }
                processedPages++;
            }
        }
        successStatus = true;
    } catch (e) {
        if (!successStatus) {
            errorMessage = e.message;
            console.error('[CrawlBudget Worker]', e);
        }
    } finally {
        const executionTime = Date.now() - startTime;
        await supabase.from('worker_health').insert({
            worker_name: 'crawl-budget',
            status: successStatus ? 'healthy' : 'error',
            last_run: new Date().toISOString(),
            message: successStatus ? `Jobs successfully aggregated ${processedPages} SEO indices` : errorMessage,
            metrics: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                retry_count: parseInt(upstashRetryCount),
                processed_pages: processedPages,
                success: successStatus
            }
        });
    }

    if (!successStatus) {
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, processedPages });
}
