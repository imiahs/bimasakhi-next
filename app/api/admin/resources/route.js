import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

const RESOURCE_STATUSES = new Set(['draft', 'published', 'archived']);

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildResourceTimestamps(nextStatus, existingResource, now) {
    return {
        updated_at: now,
        published_at: nextStatus === 'published'
            ? (existingResource?.published_at || now)
            : existingResource?.published_at || null,
        archived_at: nextStatus === 'archived' ? now : null,
    };
}

// GET: Fetch all resources
export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            const { data, error } = await supabase
                .from('resources')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return NextResponse.json({ success: true, resource: data });
        }

        const status = (searchParams.get('status') || 'all').trim().toLowerCase();
        const search = (searchParams.get('search') || '').trim();
        const gated = (searchParams.get('gated') || 'all').trim().toLowerCase();
        const page = parsePositiveInt(searchParams.get('page'), 1);
        const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 20), 100);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('resources')
            .select('*', { count: 'exact' })
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status !== 'all') {
            if (!RESOURCE_STATUSES.has(status)) {
                return NextResponse.json({ success: false, error: 'Invalid resource status filter.' }, { status: 400 });
            }

            query = query.eq('status', status);
        }

        if (gated === 'gated') {
            query = query.eq('requires_lead_form', true);
        } else if (gated === 'ungated') {
            query = query.eq('requires_lead_form', false);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,file_url.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            resources: data || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
        });
    } catch (error) {
        console.error('API /admin/resources GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch resources' }, { status: 500 });
    }
});

// POST: Create a new resource record
export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();
        const title = String(payload.title || '').trim();
        const fileUrl = String(payload.file_url || '').trim();
        const nextStatus = RESOURCE_STATUSES.has(String(payload.status || '').trim().toLowerCase())
            ? String(payload.status).trim().toLowerCase()
            : 'draft';
        const now = new Date().toISOString();

        if (!title) {
            return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 });
        }

        if (!fileUrl) {
            return NextResponse.json({ success: false, error: 'File URL is required.' }, { status: 400 });
        }

        const timestamps = buildResourceTimestamps(nextStatus, null, now);

        const { data, error } = await supabase
            .from('resources')
            .insert({
                title,
                description: payload.description || null,
                file_url: fileUrl,
                requires_lead_form: payload.requires_lead_form !== false,
                status: nextStatus,
                updated_at: now,
                published_at: timestamps.published_at,
                archived_at: timestamps.archived_at,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, resource: data });
    } catch (error) {
        console.error('API /admin/resources POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create resource' }, { status: 500 });
    }
});

// PUT: Update an existing resource
export const PUT = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();
        const { id, ...updates } = payload;
        const now = new Date().toISOString();

        if (!id) return NextResponse.json({ success: false, error: 'Missing resource ID' }, { status: 400 });

        const { data: existingResource, error: existingError } = await supabase
            .from('resources')
            .select('*')
            .eq('id', id)
            .single();

        if (existingError || !existingResource) {
            return NextResponse.json({ success: false, error: 'Resource not found.' }, { status: 404 });
        }

        const nextStatus = updates.status !== undefined
            ? String(updates.status || '').trim().toLowerCase()
            : String(existingResource.status || 'draft').trim().toLowerCase();

        if (!RESOURCE_STATUSES.has(nextStatus)) {
            return NextResponse.json({ success: false, error: 'Invalid resource status.' }, { status: 400 });
        }

        const nextTitle = updates.title !== undefined ? String(updates.title || '').trim() : existingResource.title;
        const nextFileUrl = updates.file_url !== undefined ? String(updates.file_url || '').trim() : existingResource.file_url;

        if (!nextTitle) {
            return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 });
        }

        if (!nextFileUrl) {
            return NextResponse.json({ success: false, error: 'File URL is required.' }, { status: 400 });
        }

        const timestamps = buildResourceTimestamps(nextStatus, existingResource, now);

        const { data, error } = await supabase
            .from('resources')
            .update({
                title: nextTitle,
                description: updates.description !== undefined ? (updates.description || null) : existingResource.description,
                file_url: nextFileUrl,
                requires_lead_form: updates.requires_lead_form !== undefined ? Boolean(updates.requires_lead_form) : existingResource.requires_lead_form,
                status: nextStatus,
                updated_at: timestamps.updated_at,
                published_at: timestamps.published_at,
                archived_at: timestamps.archived_at,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, resource: data });
    } catch (error) {
        console.error('API /admin/resources PUT error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update resource' }, { status: 500 });
    }
});

// DELETE: Remove a resource
export const DELETE = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const now = new Date().toISOString();

        if (!id) return NextResponse.json({ success: false, error: 'Missing resource ID' }, { status: 400 });

        const { data, error } = await supabase
            .from('resources')
            .update({
                status: 'archived',
                updated_at: now,
                archived_at: now,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Resource archived', resource: data });
    } catch (error) {
        console.error('API /admin/resources DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Failed to archive resource' }, { status: 500 });
    }
});
