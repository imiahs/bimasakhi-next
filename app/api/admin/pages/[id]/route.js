import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
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

export const PUT = withAdminAuth(async (request, user) => {
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

        // Before applying changes, fetch CURRENT state and save as a version snapshot if it has blocks
        const { data: currentBlocks } = await supabase.from('page_blocks').select('*').eq('page_id', id).order('block_order', { ascending: true });
        const { data: currentPage } = await supabase.from('custom_pages').select('*').eq('id', id).single();

        if (currentPage && currentBlocks) {
            const { data: agg } = await supabase.from('page_versions').select('version_number').eq('page_id', id).order('version_number', { ascending: false }).limit(1).maybeSingle();
            let nextVersion = agg ? agg.version_number + 1 : 1;

            await supabase.from('page_versions').insert({
                page_id: id,
                version_number: nextVersion,
                snapshot_data: {
                    title: currentPage.title,
                    meta_title: currentPage.meta_title,
                    meta_description: currentPage.meta_description,
                    blocks: currentBlocks
                }
            });
        }

        // Update the base page
        const { error: pageErr } = await supabase.from('custom_pages').update({
            title: finalTitle, meta_title: finalMetaTitle, meta_description: finalMetaDesc, status, is_campaign_page, updated_at: new Date().toISOString()
        }).eq('id', id);

        if (pageErr) throw pageErr;

        // Synchronize Blocks
        await supabase.from('page_blocks').delete().eq('page_id', id);

        if (blocksToApply && blocksToApply.length > 0) {
            const blockInserts = blocksToApply.map((b, index) => ({
                page_id: id,
                block_type: b.block_type,
                block_order: index,
                block_data: b.block_data || {}
            }));
            const { error: insertErr } = await supabase.from('page_blocks').insert(blockInserts);
            if (insertErr) throw insertErr;
        }

        return NextResponse.json({ success: true, message: is_rollback ? "Rollback applied successfully" : "Update saved successfully" });
    } catch (err) {
        console.error("Error synchronizing page details:", err);
        return NextResponse.json({ error: "Failed to save page map." }, { status: 500 });
    }
});
