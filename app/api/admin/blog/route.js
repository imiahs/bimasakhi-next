import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { generateAiContent } from '@/lib/ai/generateContent';
import { getSystemPrompt } from '@/lib/ai/promptTemplates';
import { getFeatureFlag } from '@/lib/featureFlags';
import { getSystemConfig } from '@/lib/systemConfig';

const BLOG_STATUSES = new Set(['draft', 'published', 'archived']);
const CMS_UUID_FIELDS = new Set(['category_id', 'topic_id']);
const CMS_BLOG_FIELDS = ['category_id', 'topic_id', 'excerpt', 'canonical_url', 'robots_setting'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_PROMPT_AUDIENCE = 'women aged 25-45 from middle-class families looking for financial independence';

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-/]+|[-/]+$/g, '');
}

function buildBlogTimestamps(nextStatus, existingPost, now) {
    return {
        updated_at: now,
        published_at: nextStatus === 'published'
            ? (existingPost?.published_at || now)
            : existingPost?.published_at || null,
        archived_at: nextStatus === 'archived' ? now : null,
    };
}

function decorateBlogStructure(post) {
    if (!post) return post;

    return {
        ...post,
        parent_id: null,
        full_slug: post.slug ? `blog/${post.slug}` : null,
        page_type: 'blog_post',
    };
}

function readCmsFieldUpdates(payload, allowedFields) {
    const updates = {};

    for (const field of allowedFields) {
        if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;

        const value = payload[field];
        if (value === undefined) continue;

        if (CMS_UUID_FIELDS.has(field)) {
            if (value === null || String(value).trim() === '') {
                updates[field] = null;
                continue;
            }

            const normalized = String(value).trim();
            if (!UUID_PATTERN.test(normalized)) {
                throw new Error(`${field} must be a UUID or empty.`);
            }
            updates[field] = normalized;
            continue;
        }

        updates[field] = value === null ? null : String(value).trim() || null;
    }

    return updates;
}

function parseGeneratedBlogJson(text) {
    let clean = String(text || '').trim();
    if (clean.startsWith('```json')) clean = clean.substring(7);
    else if (clean.startsWith('```')) clean = clean.substring(3);
    if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
    return JSON.parse(clean.trim());
}

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
    const intent = input.intent || input.intent_type || nested.intent || nested.intent_type || input.content_level || 'blog';
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
        audience: input.audience || nested.audience || DEFAULT_PROMPT_AUDIENCE,
    };
}

function renderTemplate(template, values) {
    return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
        const value = values[key];
        if (Array.isArray(value)) return value.join(', ');
        if (value === null || value === undefined || value === '') return '';
        return String(value);
    });
}

async function fetchPromptTemplate(supabase, { templateId, intent }) {
    if (!supabase) return null;

    if (templateId) {
        const { data, error } = await supabase
            .from('prompt_templates')
            .select('*')
            .eq('id', templateId)
            .maybeSingle();

        if (!error && data) return data;
    }

    const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(50);

    if (error || !Array.isArray(data)) return null;

    return data.find((row) => row.intent_type === intent && row.metadata?.default === true)
        || data.find((row) => row.metadata?.default === true)
        || data.find((row) => row.intent_type === intent)
        || data[0]
        || null;
}

async function resolveBlogPrompt({ supabase, payload }) {
    const title = String(payload.title || payload.topic || payload.keyword || '').trim();
    const inputs = normalizePromptInputs({
        ...payload,
        keyword: payload.keyword || title,
        intent: payload.intent || payload.intent_type || 'blog',
    });

    const fallbackSystemPrompt = getSystemPrompt();
    const fallbackUserPrompt = `Write a complete SEO blog post for:

TOPIC: ${title}
PRIMARY KEYWORD: ${payload.keyword || title}
LOCATION: ${inputs.location}
INTENT: ${inputs.intent}
ROLE: ${inputs.role}
TONE: ${inputs.tone}
SECONDARY KEYWORDS: ${inputs.keywords.join(', ')}

Return ONLY valid JSON:
{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "content": "string with HTML paragraphs/headings",
  "meta_title": "string",
  "meta_description": "string"
}`;

    try {
        const enabled = await getFeatureFlag('ai_prompt_templates_enabled');
        if (!enabled) {
            return { systemPrompt: fallbackSystemPrompt, userPrompt: fallbackUserPrompt, source: 'fallback', promptInputs: inputs, template: null };
        }

        const template = await fetchPromptTemplate(supabase, {
            templateId: inputs.prompt_template_id,
            intent: inputs.intent,
        });

        if (!template?.template_body) {
            return { systemPrompt: fallbackSystemPrompt, userPrompt: fallbackUserPrompt, source: 'fallback', promptInputs: inputs, template: null };
        }

        if (!inputs.prompt_template_id && template.intent_type !== inputs.intent) {
            return { systemPrompt: fallbackSystemPrompt, userPrompt: fallbackUserPrompt, source: 'fallback', promptInputs: inputs, template: null };
        }

        return {
            systemPrompt: template.metadata?.system_prompt || fallbackSystemPrompt,
            userPrompt: renderTemplate(template.template_body, {
                ...inputs,
                title,
                keyword: payload.keyword || title,
                slug: payload.slug || '',
            }),
            source: 'template',
            template,
            promptInputs: {
                ...inputs,
                prompt_template_id: template.id,
                template_id: template.id,
            },
        };
    } catch (error) {
        console.error('[Blog] prompt resolution failed:', error.message);
        return { systemPrompt: fallbackSystemPrompt, userPrompt: fallbackUserPrompt, source: 'fallback', promptInputs: inputs, template: null };
    }
}

// GET: Fetch all blog posts
export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const slug = searchParams.get('slug');

        if (id) {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return NextResponse.json({ success: true, post: decorateBlogStructure(data) });
        }

        if (slug) {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .eq('slug', slug)
                .single();
            if (error) throw error;
            return NextResponse.json({ success: true, post: decorateBlogStructure(data) });
        }

        const status = (searchParams.get('status') || 'all').trim().toLowerCase();
        const search = (searchParams.get('search') || '').trim();
        const page = parsePositiveInt(searchParams.get('page'), 1);
        const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 20), 100);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('blog_posts')
            .select('id, slug, title, content, meta_title, meta_description, author, status, views, category_id, topic_id, excerpt, canonical_url, robots_setting, created_at, updated_at, published_at, archived_at', { count: 'exact' })
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status !== 'all') {
            if (!BLOG_STATUSES.has(status)) {
                return NextResponse.json({ success: false, error: 'Invalid blog status filter.' }, { status: 400 });
            }

            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%,meta_title.ilike.%${search}%,meta_description.ilike.%${search}%,author.ilike.%${search}%`);
        }

        const { data: posts, error: listError, count } = await query;

        if (listError) throw listError;

        return NextResponse.json({
            success: true,
            posts: (posts || []).map(decorateBlogStructure),
            total: count || 0,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
        });
    } catch (error) {
        console.error('API /admin/blog GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch posts' }, { status: 500 });
    }
});

// POST: Create a new blog post
export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();
        if (payload.action === 'generate') {
            // RC-1B: Gate AI execution on ai_enabled flag
            const config = await getSystemConfig();
            if (!config.ai_enabled) {
                return NextResponse.json({ success: false, error: 'AI_DISABLED' }, { status: 503 });
            }

            const topic = String(payload.topic || payload.title || payload.keyword || '').trim();
            if (!topic) {
                return NextResponse.json({ success: false, error: 'Topic is required.' }, { status: 400 });
            }

            const promptResult = await resolveBlogPrompt({ supabase, payload: { ...payload, topic } });
            const responseText = await generateAiContent(promptResult.systemPrompt, promptResult.userPrompt);
            if (!responseText) {
                return NextResponse.json({ success: false, error: 'AI returned no blog content.' }, { status: 502 });
            }

            let generated;
            try {
                generated = parseGeneratedBlogJson(responseText);
            } catch (error) {
                return NextResponse.json({ success: false, error: `AI JSON parse failed: ${error.message}` }, { status: 502 });
            }

            const title = String(generated.title || topic).trim();
            const content = String(generated.content || '').trim();
            if (!title || !content) {
                return NextResponse.json({ success: false, error: 'Generated blog is missing title or content.' }, { status: 502 });
            }

            const resolvedSlug = normalizeSlug(generated.slug || payload.slug || title);
            const { data: existingPost } = await supabase
                .from('blog_posts')
                .select('id')
                .eq('slug', resolvedSlug)
                .maybeSingle();

            if (existingPost) {
                return NextResponse.json({ success: false, error: 'Generated slug already exists.' }, { status: 409 });
            }

            const now = new Date().toISOString();
            const promptInputs = promptResult.promptInputs || {};
            const insertPayload = {
                slug: resolvedSlug,
                title,
                content,
                meta_title: generated.meta_title || title,
                meta_description: generated.meta_description || generated.excerpt || null,
                excerpt: generated.excerpt || null,
                author: payload.author || user?.email || 'Admin',
                status: 'draft',
                updated_at: now,
                published_at: null,
                archived_at: null,
                prompt_template_id: promptInputs.prompt_template_id || null,
                intent_type: promptInputs.intent || 'blog',
                keywords: promptInputs.keywords || [],
                tone: promptInputs.tone || null,
                role: promptInputs.role || null,
                location: promptInputs.location || null,
                prompt_inputs: promptInputs,
            };

            let insertResult = await supabase
                .from('blog_posts')
                .insert(insertPayload)
                .select()
                .single();

            if (insertResult.error && /(prompt_|intent_type|keywords|tone|role|location)/i.test(insertResult.error.message || '')) {
                const {
                    prompt_template_id,
                    intent_type,
                    keywords,
                    tone,
                    role,
                    location,
                    prompt_inputs,
                    ...legacyPayload
                } = insertPayload;

                insertResult = await supabase
                    .from('blog_posts')
                    .insert(legacyPayload)
                    .select()
                    .single();
            }

            if (insertResult.error) throw insertResult.error;

            return NextResponse.json({
                success: true,
                post: decorateBlogStructure(insertResult.data),
                prompt_source: promptResult.source,
            });
        }

        const title = String(payload.title || '').trim();
        const content = String(payload.content || '').trim();
        const now = new Date().toISOString();

        if (!title) {
            return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 });
        }

        if (!content) {
            return NextResponse.json({ success: false, error: 'Content is required.' }, { status: 400 });
        }

        const resolvedSlug = normalizeSlug(payload.slug || title);

        if (!resolvedSlug) {
            return NextResponse.json({ success: false, error: 'Slug is required.' }, { status: 400 });
        }

        const nextStatus = BLOG_STATUSES.has(String(payload.status || '').trim().toLowerCase())
            ? String(payload.status).trim().toLowerCase()
            : 'draft';

        const { data: existingPost } = await supabase
            .from('blog_posts')
            .select('id')
            .eq('slug', resolvedSlug)
            .maybeSingle();

        if (existingPost) {
            return NextResponse.json({ success: false, error: 'Slug already exists.' }, { status: 400 });
        }

        const timestamps = buildBlogTimestamps(nextStatus, null, now);

        const cmsUpdates = readCmsFieldUpdates(payload, CMS_BLOG_FIELDS);

        const { data, error } = await supabase
            .from('blog_posts')
            .insert({
                slug: resolvedSlug,
                title,
                content,
                meta_title: payload.meta_title || null,
                meta_description: payload.meta_description || null,
                author: payload.author || 'Admin',
                status: nextStatus,
                updated_at: now,
                published_at: timestamps.published_at,
                archived_at: timestamps.archived_at,
                ...cmsUpdates,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, post: decorateBlogStructure(data) });
    } catch (error) {
        console.error('API /admin/blog POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create post' }, { status: 500 });
    }
});

// PUT: Update an existing blog post
export const PUT = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();
        const { id, ...updates } = payload;
        const now = new Date().toISOString();

        if (!id) return NextResponse.json({ success: false, error: 'Missing post ID' }, { status: 400 });

        const { data: existingPost, error: existingError } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', id)
            .single();

        if (existingError || !existingPost) {
            return NextResponse.json({ success: false, error: 'Post not found.' }, { status: 404 });
        }

        const rpcUpdates = {};

        if (updates.title !== undefined) {
            const nextTitle = String(updates.title || '').trim();
            if (!nextTitle) {
                return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 });
            }
            rpcUpdates.title = nextTitle;
        }

        if (updates.content !== undefined) {
            const nextContent = String(updates.content || '').trim();
            if (!nextContent) {
                return NextResponse.json({ success: false, error: 'Content is required.' }, { status: 400 });
            }
            rpcUpdates.content = nextContent;
        }

        if (updates.slug !== undefined) {
            const nextSlug = normalizeSlug(updates.slug);

            if (!nextSlug) {
                return NextResponse.json({ success: false, error: 'Slug is required.' }, { status: 400 });
            }

            const { data: duplicatePost, error: duplicateError } = await supabase
                .from('blog_posts')
                .select('id')
                .eq('slug', nextSlug)
                .neq('id', id)
                .maybeSingle();

            if (duplicateError) throw duplicateError;

            if (duplicatePost) {
                return NextResponse.json({ success: false, error: 'Slug already exists.' }, { status: 400 });
            }

            rpcUpdates.slug = nextSlug;
        }

        if (updates.meta_title !== undefined) {
            rpcUpdates.meta_title = updates.meta_title || null;
        }

        if (updates.meta_description !== undefined) {
            rpcUpdates.meta_description = updates.meta_description || null;
        }

        if (updates.author !== undefined) {
            rpcUpdates.author = updates.author || 'Admin';
        }

        const cmsUpdates = readCmsFieldUpdates(updates, CMS_BLOG_FIELDS);

        const nextStatus = updates.status !== undefined
            ? String(updates.status || '').trim().toLowerCase()
            : String(existingPost.status || 'draft').trim().toLowerCase();

        if (!BLOG_STATUSES.has(nextStatus)) {
            return NextResponse.json({ success: false, error: 'Invalid blog status.' }, { status: 400 });
        }

        rpcUpdates.status = nextStatus;

        const updateKey = crypto
            .createHash('sha256')
            .update(JSON.stringify({ postId: id, updates: rpcUpdates }))
            .digest('hex');

        const { error } = await supabase.rpc('rule16_update_blog_post', {
            p_post_id: id,
            p_updates: rpcUpdates,
            p_idempotency_key: updateKey,
        });

        if (error) throw error;

        const timestamps = buildBlogTimestamps(nextStatus, existingPost, now);

        const { error: metaError } = await supabase
            .from('blog_posts')
            .update({ ...timestamps, ...cmsUpdates })
            .eq('id', id);

        if (metaError) throw metaError;

        const { data, error: refetchErr } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', id)
            .single();

        if (refetchErr) throw refetchErr;

        return NextResponse.json({ success: true, post: decorateBlogStructure(data) });
    } catch (error) {
        console.error('API /admin/blog PUT error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update post' }, { status: 500 });
    }
});

// DELETE: Remove a blog post
export const DELETE = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const now = new Date().toISOString();

        if (!id) return NextResponse.json({ success: false, error: 'Missing post ID' }, { status: 400 });

        const { data: existingPost, error: existingError } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', id)
            .single();

        if (existingError || !existingPost) {
            return NextResponse.json({ success: false, error: 'Post not found.' }, { status: 404 });
        }

        if (existingPost.status === 'archived') {
            return NextResponse.json({ success: true, post: decorateBlogStructure(existingPost), message: 'Post already archived' });
        }

        const updateKey = crypto
            .createHash('sha256')
            .update(JSON.stringify({ postId: id, action: 'archive' }))
            .digest('hex');

        const { error } = await supabase.rpc('rule16_update_blog_post', {
            p_post_id: id,
            p_updates: { status: 'archived' },
            p_idempotency_key: updateKey,
        });

        if (error) throw error;

        const { error: metaError } = await supabase
            .from('blog_posts')
            .update({ updated_at: now, archived_at: now })
            .eq('id', id);

        if (metaError) throw metaError;

        const { data: archivedPost, error: refetchErr } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', id)
            .single();

        if (refetchErr) throw refetchErr;

        return NextResponse.json({ success: true, message: 'Post archived', post: decorateBlogStructure(archivedPost) });
    } catch (error) {
        console.error('API /admin/blog DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Failed to archive post' }, { status: 500 });
    }
});
