import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

const PAGE_STATUSES = new Set(['draft', 'published', 'archived']);

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-/]+|[-/]+$/g, '');
}

export const GET = withAdminAuth(async (request, user, { params }) => {
    try {
        const { id } = await params;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ page: null, blocks: [], versions: [] });
        }

        const supabase = getServiceSupabase();

        const { data: page, error: pageErr } = await supabase.from('custom_pages').select('*').eq('id', id).single();
        if (pageErr) throw pageErr;

        const { data: blocks, error: blockErr } = await supabase.from('page_blocks').select('*').eq('page_id', id).order('block_order', { ascending: true });
        if (blockErr) throw blockErr;

        const { data: versions } = await supabase.from('page_versions').select('id, version_number, created_at').eq('page_id', id).order('version_number', { ascending: false });

        return NextResponse.json({ page, blocks, versions: versions || [] });
    } catch (err) {
        console.error("Error fetching page details:", err);
        return NextResponse.json({ error: "Failed to fetch page specifics." }, { status: 500 });
    }
});

export const PATCH = withAdminAuth(async (request, user, { params }) => {
    try {
        const { id } = await params;
        const reqData = await request.json();
        const supabase = getServiceSupabase();

        const updates = {};

        if (reqData.title !== undefined) {
            if (!String(reqData.title || '').trim()) {
                return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 });
            }
            updates.title = String(reqData.title).trim();
        }

        if (reqData.slug !== undefined) {
            const nextSlug = normalizeSlug(reqData.slug);

            if (!nextSlug) {
                return NextResponse.json({ success: false, error: 'Slug is required.' }, { status: 400 });
            }

            const { data: existingSlug, error: slugLookupError } = await supabase
                .from('custom_pages')
                .select('id')
                .eq('slug', nextSlug)
                .neq('id', id)
                .maybeSingle();

            if (slugLookupError) {
                throw slugLookupError;
            }

            if (existingSlug) {
                return NextResponse.json({ success: false, error: 'Slug already exists.' }, { status: 400 });
            }

            updates.slug = nextSlug;
        }

        if (reqData.meta_title !== undefined) {
            updates.meta_title = reqData.meta_title || null;
        }

        if (reqData.meta_description !== undefined) {
            updates.meta_description = reqData.meta_description || null;
        }

        if (reqData.is_campaign_page !== undefined) {
            updates.is_campaign_page = !!reqData.is_campaign_page;
        }

        if (reqData.status !== undefined) {
            const nextStatus = String(reqData.status || '').trim().toLowerCase();
            if (!PAGE_STATUSES.has(nextStatus)) {
                return NextResponse.json({ success: false, error: 'Invalid page status.' }, { status: 400 });
            }
            updates.status = nextStatus;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ success: false, error: 'No updates supplied.' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('custom_pages')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, page: data });
    } catch (err) {
        console.error('Error patching page details:', err);
        return NextResponse.json({ success: false, error: 'Failed to update page.' }, { status: 500 });
    }
});

export const PUT = withAdminAuth(async (request, user, { params }) => {
    try {
        const { id } = await params;
        const reqData = await request.json();
        const { title, slug, meta_title, meta_description, status, is_campaign_page, blocks, is_rollback, rollback_version_id } = reqData;

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = getServiceSupabase();

        // If it's a rollback request, fetch the snapshot and bypass standard blocks payload
        let blocksToApply = blocks;
        let finalTitle = title;
        let finalMetaTitle = meta_title;
        let finalMetaDesc = meta_description;

        if (is_rollback && rollback_version_id) {
            const { data: snapshotData } = await supabase.from('page_versions').select('snapshot_data').eq('id', rollback_version_id).single();
            if (snapshotData && snapshotData.snapshot_data) {
                finalTitle = snapshotData.snapshot_data.title;
                finalMetaTitle = snapshotData.snapshot_data.meta_title;
                finalMetaDesc = snapshotData.snapshot_data.meta_description;
                blocksToApply = snapshotData.snapshot_data.blocks;
            }
        }

        const rpcPayload = {
            title: finalTitle,
            meta_title: finalMetaTitle,
            meta_description: finalMetaDesc,
            status,
            is_campaign_page,
            blocks: Array.isArray(blocksToApply) ? blocksToApply : [],
        };

        const updateKey = crypto
            .createHash('sha256')
            .update(JSON.stringify({ pageId: id, rpcPayload }))
            .digest('hex');

        const { error: pageErr } = await supabase.rpc('rule16_update_custom_page', {
            p_page_id: id,
            p_payload: rpcPayload,
            p_saved_by: user?.id || null,
            p_idempotency_key: updateKey,
        });

        if (pageErr) throw pageErr;

        const metadataUpdates = {};

        if (slug !== undefined) {
            const nextSlug = normalizeSlug(slug);

            if (!nextSlug) {
                return NextResponse.json({ success: false, error: 'Slug is required.' }, { status: 400 });
            }

            const { data: existingSlug, error: slugLookupError } = await supabase
                .from('custom_pages')
                .select('id')
                .eq('slug', nextSlug)
                .neq('id', id)
                .maybeSingle();

            if (slugLookupError) throw slugLookupError;
            if (existingSlug) {
                return NextResponse.json({ success: false, error: 'Slug already exists.' }, { status: 400 });
            }

            metadataUpdates.slug = nextSlug;
        }

        if (Object.prototype.hasOwnProperty.call(reqData, 'title')) {
            metadataUpdates.title = title;
        }

        if (Object.keys(metadataUpdates).length > 0) {
            const { error: metadataError } = await supabase
                .from('custom_pages')
                .update({ ...metadataUpdates, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (metadataError) throw metadataError;
        }

        return NextResponse.json({ success: true, message: is_rollback ? "Rollback applied successfully" : "Update saved successfully" });
    } catch (err) {
        console.error("Error synchronizing page details:", err);
        return NextResponse.json({ error: "Failed to save page map." }, { status: 500 });
    }
});

export const DELETE = withAdminAuth(async (request, user, { params }) => {
    try {
        const { id } = await params;
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('custom_pages')
            .update({ status: 'archived', updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('id, status')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, page: data });
    } catch (err) {
        console.error('Error archiving page:', err);
        return NextResponse.json({ success: false, error: 'Failed to archive page.' }, { status: 500 });
    }
});
