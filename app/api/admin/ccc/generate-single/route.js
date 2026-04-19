import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/ccc/generate-single
 * Fix 2d: Trigger AI generation for a single page by slug.
 * Inserts a job into generation_queue for the pagegen worker to pick up.
 */
export const POST = withAdminAuth(async (request) => {
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

        // Insert into generation_queue for pagegen worker
        const { data, error } = await supabase
            .from('generation_queue')
            .insert({
                slug: cleanSlug,
                task_type: 'pagegen',
                status: 'pending',
                priority: 1,
                metadata: { source: 'ccc_single_generation', triggered_by: 'admin' },
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
