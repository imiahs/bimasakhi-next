import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

function buildSinglePagePayload(slug) {
    const keywordText = slug.replace(/-/g, ' ').trim();

    return {
        version: 1,
        source: 'ccc_single_generation',
        pages: [
            {
                slug,
                keyword_text: keywordText,
                page_type: 'locality_page',
                content_level: 'locality_page',
            },
        ],
    };
}

/**
 * POST /api/admin/ccc/generate-single
 * Fix 2d: Trigger AI generation for a single page by slug.
 * Inserts a job into generation_queue for the pagegen worker to pick up.
 */
export const POST = withAdminAuth(async (request, user) => {
    try {
        const { slug } = await request.json();

        if (!slug || typeof slug !== 'string' || slug.trim().length < 3) {
            return NextResponse.json({ success: false, error: 'Valid slug is required (min 3 chars)' }, { status: 400 });
        }

        const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const supabase = getServiceSupabase();

        // Check if draft with this slug already exists
        const { data: existing } = await supabase
            .from('content_drafts')
            .select('id, status')
            .eq('slug', cleanSlug)
            .single();

        if (existing) {
            return NextResponse.json({
                success: false,
                error: `Draft with slug "${cleanSlug}" already exists (status: ${existing.status}). Edit it from the drafts list.`
            }, { status: 409 });
        }

        const { data: existingQueue, error: existingQueueError } = await supabase
            .from('generation_queue')
            .select('id, status')
            .eq('slug', cleanSlug)
            .in('status', ['pending', 'processing', 'paused'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingQueueError) {
            console.error('[Generate Single] Queue lookup error:', existingQueueError);
            return NextResponse.json({ success: false, error: existingQueueError.message }, { status: 500 });
        }

        if (existingQueue) {
            return NextResponse.json({
                success: false,
                error: `Generation already queued for "${cleanSlug}" (queue ID: ${existingQueue.id}, status: ${existingQueue.status}).`
            }, { status: 409 });
        }

        const payload = buildSinglePagePayload(cleanSlug);

        // Insert into generation_queue for pagegen worker
        const { data, error } = await supabase
            .from('generation_queue')
            .insert({
                slug: cleanSlug,
                task_type: 'pagegen',
                payload,
                status: 'pending',
                total_items: payload.pages.length,
                priority: 1,
                created_by: user?.email || user?.id || 'admin',
                metadata: {
                    source: 'ccc_single_generation',
                    triggered_by: user?.email || user?.id || 'admin',
                },
            })
            .select('id')
            .single();

        if (error) {
            console.error('[Generate Single] Queue insert error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Page generation queued for "${cleanSlug}" (queue ID: ${data.id}). The pagegen worker will process it.`,
            queueId: data.id,
        });
    } catch (err) {
        console.error('[Generate Single] API error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}, ['super_admin', 'admin']);
