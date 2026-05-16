import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESOURCES = {
    topics: {
        table: 'content_topics',
        read: ['id', 'name', 'slug', 'description', 'status', 'metadata', 'created_at', 'updated_at'],
        write: ['name', 'slug', 'description', 'status', 'metadata'],
        json: new Set(['metadata']),
        uuid: new Set(),
    },
    categories: {
        table: 'content_categories',
        read: ['id', 'topic_id', 'name', 'slug', 'description', 'status', 'metadata', 'created_at', 'updated_at'],
        write: ['topic_id', 'name', 'slug', 'description', 'status', 'metadata'],
        json: new Set(['metadata']),
        uuid: new Set(['topic_id']),
    },
    internal_links: {
        table: 'internal_links',
        read: ['id', 'source_type', 'source_id', 'source_slug', 'target_type', 'target_id', 'target_slug', 'anchor_text', 'context', 'metadata', 'created_at', 'updated_at'],
        write: ['source_type', 'source_id', 'source_slug', 'target_type', 'target_id', 'target_slug', 'anchor_text', 'context', 'metadata'],
        json: new Set(['metadata']),
        uuid: new Set(['source_id', 'target_id']),
    },
    redirects: {
        table: 'redirects',
        read: ['id', 'source_path', 'target_path', 'status_code', 'reason', 'active', 'metadata', 'created_at', 'updated_at'],
        write: ['source_path', 'target_path', 'status_code', 'reason', 'active', 'metadata'],
        json: new Set(['metadata']),
        uuid: new Set(),
        boolean: new Set(['active']),
        integer: new Set(['status_code']),
    },
    prompt_templates: {
        table: 'prompt_templates',
        read: ['id', 'name', 'description', 'role', 'tone', 'intent_type', 'template_body', 'variables', 'keywords', 'status', 'metadata', 'created_at', 'updated_at'],
        write: ['name', 'description', 'role', 'tone', 'intent_type', 'template_body', 'variables', 'keywords', 'status', 'metadata'],
        json: new Set(['variables', 'keywords', 'metadata']),
        uuid: new Set(),
    },
    page_index_structure: {
        table: 'page_index',
        read: ['id', 'page_slug', 'page_type', 'status', 'parent_id', 'full_slug', 'content_type', 'intent_type', 'canonical_url', 'robots_setting', 'created_at', 'updated_at'],
        write: ['parent_id', 'full_slug', 'content_type', 'intent_type', 'canonical_url', 'robots_setting'],
        json: new Set(),
        uuid: new Set(['parent_id']),
        existingOnly: true,
    },
};

function getConfig(resource) {
    return RESOURCES[String(resource || '').trim()] || null;
}

function normalizePayload(payload, config) {
    const updates = {};

    for (const field of config.write) {
        if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;

        const value = payload[field];
        if (value === undefined) continue;

        if (config.uuid.has(field)) {
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

        if (config.json.has(field)) {
            updates[field] = value === '' ? null : value;
            continue;
        }

        if (config.boolean?.has(field)) {
            updates[field] = value === null || value === '' ? null : value === true || value === 'true';
            continue;
        }

        if (config.integer?.has(field)) {
            if (value === null || value === '') {
                updates[field] = null;
                continue;
            }
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) {
                throw new Error(`${field} must be an integer or empty.`);
            }
            updates[field] = parsed;
            continue;
        }

        updates[field] = value === null ? null : String(value).trim() || null;
    }

    return updates;
}

export const GET = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const resource = searchParams.get('resource') || 'topics';
        const config = getConfig(resource);

        if (!config) {
            return NextResponse.json({ success: false, error: 'Invalid CMS structure resource.' }, { status: 400 });
        }

        const limit = Math.min(Number.parseInt(searchParams.get('limit') || '100', 10), 500);
        const { data, error } = await supabase
            .from(config.table)
            .select(config.read.join(', '))
            .order('created_at', { ascending: false })
            .limit(Number.isFinite(limit) && limit > 0 ? limit : 100);

        if (error) throw error;

        return NextResponse.json({ success: true, resource, rows: data || [] });
    } catch (error) {
        console.error('[CMS Structure] GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to read CMS structure data.' }, { status: 500 });
    }
});

export const POST = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();
        const config = getConfig(payload.resource);

        if (!config || config.existingOnly) {
            return NextResponse.json({ success: false, error: 'Invalid CMS structure resource for create.' }, { status: 400 });
        }

        const updates = normalizePayload(payload, config);
        const { data, error } = await supabase
            .from(config.table)
            .insert({ ...updates, updated_at: new Date().toISOString() })
            .select(config.read.join(', '))
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, resource: payload.resource, row: data });
    } catch (error) {
        console.error('[CMS Structure] POST error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to create CMS structure data.' }, { status: 500 });
    }
});

export const PATCH = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();
        const config = getConfig(payload.resource);

        if (!config) {
            return NextResponse.json({ success: false, error: 'Invalid CMS structure resource.' }, { status: 400 });
        }

        if (!payload.id) {
            return NextResponse.json({ success: false, error: 'id is required.' }, { status: 400 });
        }

        const updates = normalizePayload(payload, config);
        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ success: false, error: 'No updates supplied.' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from(config.table)
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', payload.id)
            .select(config.read.join(', '))
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, resource: payload.resource, row: data });
    } catch (error) {
        console.error('[CMS Structure] PATCH error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to update CMS structure data.' }, { status: 500 });
    }
});
