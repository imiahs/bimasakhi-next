const fs = require('fs');
const { Client } = require('pg');

const envLocal = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';

const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    const match = envLocal.match(new RegExp(`^${key}=['"]?(.*?)['"]?$`, 'm'));
    return match ? match[1].trim() : null;
};

async function main() {
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const password = getEnv('Database_Password');

    if (!supabaseUrl || !password) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or Database_Password');
    }

    const host = supabaseUrl.replace('https://', 'db.');
    const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    const slug = `p2-publish-archive-probe-${Date.now()}`;
    let draftId = null;
    let pageId = null;

    await client.connect();

    try {
        const insert = await client.query(
            `insert into public.content_drafts (
                slug,
                page_title,
                meta_title,
                meta_description,
                hero_headline,
                body_content,
                faq_data,
                cta_text,
                word_count,
                status,
                created_at,
                updated_at
            ) values (
                $1, $2, $3, $4, $5, $6, '[]'::jsonb, $7, $8, 'draft', now(), now()
            ) returning id`,
            [slug, slug, `${slug} title`, `${slug} description`, slug, `${slug} body`, 'Apply', 900]
        );

        draftId = insert.rows[0].id;

        const publish = await client.query(
            'select public.rule16_publish_draft($1::uuid, $2::text, $3::text) as result',
            [draftId, 'p2_probe', `p2-publish-${slug}`]
        );

        const publishState = await client.query(
            `select d.status as draft_status,
                    d.page_index_id,
                    p.status as page_status,
                    p.indexing_status
             from public.content_drafts d
             left join public.page_index p
               on p.id = d.page_index_id
             where d.id = $1`,
            [draftId]
        );

        pageId = publishState.rows[0]?.page_index_id || null;

        const archive = await client.query(
            'select public.rule16_transition_draft_status($1::uuid, $2::text, $3::text, $4::text) as result',
            [draftId, 'archive', 'p2_probe', `p2-archive-${slug}`]
        );

        const archiveState = await client.query(
            `select d.status as draft_status,
                    p.status as page_status,
                    p.indexing_status
             from public.content_drafts d
             left join public.page_index p
               on p.id = d.page_index_id
             where d.id = $1`,
            [draftId]
        );

        console.log(JSON.stringify({
            slug,
            publish: publish.rows[0]?.result || null,
            publish_state: publishState.rows[0] || null,
            archive: archive.rows[0]?.result || null,
            archive_state: archiveState.rows[0] || null,
        }));
    } finally {
        if (pageId) {
            await client.query('delete from public.content_review_queue where page_index_id = $1', [pageId]).catch(() => {});
            await client.query('delete from public.location_content where page_index_id = $1', [pageId]).catch(() => {});
        }

        if (draftId) {
            await client.query('delete from public.content_drafts where id = $1', [draftId]).catch(() => {});
        }

        if (pageId) {
            await client.query('delete from public.page_index where id = $1', [pageId]).catch(() => {});
        }

        await client.end();
        console.log('cleanup-ok');
    }
}

main().catch((error) => {
    console.error('[probeDraftPublishArchive]', error.message);
    process.exit(1);
});