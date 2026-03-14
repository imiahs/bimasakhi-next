import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const maxDuration = 300; // 5 min Serverless duration

export async function POST(request) {
    const startTime = Date.now();
    const upstashMessageId = request.headers.get('upstash-message-id') || `manual-${Date.now()}`;
    const upstashRetryCount = request.headers.get('upstash-retried') || '0';
    
    const supabase = getServiceSupabase();
    let successStatus = false;
    let count = 0;
    let errorMessage = null;

    try {
        const { data: popularPages } = await supabase.from('page_index').select('page_slug').eq('status', 'active').limit(50);
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        if (popularPages) {
            for (const page of popularPages) {
                const res = await fetch(`${siteUrl}/${page.page_slug}`);
                if (!res.ok) continue;
                const html = await res.text();
                const authLessHtml = html.replace('data-auth="true"', 'data-auth="false"');

                await supabase.from('page_cache').upsert({
                    page_slug: page.page_slug,
                    cached_html: authLessHtml,
                    expires_at: new Date(Date.now() + 86400000).toISOString()
                }, { onConflict: 'page_slug' });
                count++;
            }
        }
        successStatus = true;
    } catch (e) {
        if (!successStatus) {
            errorMessage = e.message;
            console.error('[Cache Worker]', e);
        }
    } finally {
        const executionTime = Date.now() - startTime;
        await supabase.from('worker_health').insert({
            worker_name: 'cache-worker',
            status: successStatus ? 'healthy' : 'error',
            last_run: new Date().toISOString(),
            message: successStatus ? `Edge static cache generated natively. Pages cached: ${count}` : errorMessage,
            metrics: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                retry_count: parseInt(upstashRetryCount),
                cached_count: count,
                success: successStatus
            }
        });
    }

    if (!successStatus) {
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, preRendered: count });
}
