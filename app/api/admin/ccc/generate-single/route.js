import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { enqueuePageGeneration } from '@/lib/queue/publisher';

export const dynamic = 'force-dynamic';

function asPromptObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizePromptKeywords(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry || '').trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }

    return [];
}

function normalizePromptInputs(input = {}) {
    const nested = asPromptObject(input.prompt_inputs);
    const templateId = input.prompt_template_id || input.template_id || nested.prompt_template_id || nested.template_id || null;
    const intent = input.intent || input.intent_type || nested.intent || nested.intent_type || input.content_level || 'local_service';
    const location = input.location || nested.location || input.locality_name || input.city_name || input.city || 'your city';
    const keyword = input.keyword || input.keyword_text || nested.keyword || '';
    const keywords = normalizePromptKeywords(input.keywords ?? nested.keywords ?? keyword);

    return {
        role: input.role || nested.role || 'Senior LIC Development Officer and digital content strategist',
        tone: input.tone || nested.tone || 'warm, conversational Hinglish',
        keywords,
        location,
        intent,
        prompt_template_id: templateId,
        template_id: templateId,
        audience: input.audience || nested.audience || 'women aged 25-45 from middle-class families looking for financial independence',
    };
}

function buildSinglePagePayload(slug, promptInputs = {}) {
    const keywordText = slug.replace(/-/g, ' ').trim();
    const normalizedPromptInputs = normalizePromptInputs({
        ...promptInputs,
        keyword: keywordText,
        location: promptInputs.location || slug.replace(/-/g, ' '),
        intent: promptInputs.intent || promptInputs.intent_type || 'locality_page',
    });

    return {
        version: 1,
        source: 'ccc_single_generation',
        prompt_inputs: normalizedPromptInputs,
        pages: [
            {
                slug,
                keyword_text: keywordText,
                page_type: 'locality_page',
                content_level: 'locality_page',
                intent_type: normalizedPromptInputs.intent,
                role: normalizedPromptInputs.role,
                tone: normalizedPromptInputs.tone,
                keywords: normalizedPromptInputs.keywords,
                location: normalizedPromptInputs.location,
                prompt_template_id: normalizedPromptInputs.prompt_template_id,
                prompt_inputs: normalizedPromptInputs,
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
        const body = await request.json();
        const { slug } = body;

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

        const promptInputs = normalizePromptInputs({
            role: body.role,
            tone: body.tone,
            keywords: body.keywords,
            location: body.location,
            intent: body.intent || body.intent_type,
            prompt_template_id: body.prompt_template_id || body.template_id,
        });
        const payload = buildSinglePagePayload(cleanSlug, promptInputs);

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
                    prompt_inputs: promptInputs,
                },
            })
            .select('id')
            .single();

        if (error) {
            console.error('[Generate Single] Queue insert error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        let dispatchResult;
        try {
            dispatchResult = await enqueuePageGeneration({
                queueId: data.id,
                source: 'ccc_single_generation',
                requested_by: user?.email || user?.id || 'admin',
            });
        } catch (dispatchErr) {
            console.error('[Generate Single] Queue dispatch error:', dispatchErr);
            return NextResponse.json({
                success: false,
                error: `Generation queued but dispatch failed for "${cleanSlug}": ${dispatchErr.message}`,
                queueId: data.id,
            }, { status: 502 });
        }

        return NextResponse.json({
            success: true,
            message: `Page generation queued and dispatched for "${cleanSlug}" (queue ID: ${data.id}).`,
            queueId: data.id,
            dispatch: {
                messageId: dispatchResult.messageId,
            },
        });
    } catch (err) {
        console.error('[Generate Single] API error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}, ['super_admin', 'admin']);
