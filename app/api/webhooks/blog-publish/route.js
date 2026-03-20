import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const envStatus = {
        GEMINI: !!process.env.GEMINI_API_KEY,
        CRON: !!process.env.CRON_SECRET,
        SUPABASE_WEBHOOK: !!process.env.SUPABASE_WEBHOOK_SECRET
    };
    console.log("ENV TEST:", envStatus);

    try {
        // Only accept webhooks if secret is set and matches
        const secret = request.headers.get('authorization');
        if (process.env.SUPABASE_WEBHOOK_SECRET && secret !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) {
             return NextResponse.json({ error: 'Unauthorized payload.' }, { status: 401 });
        }

        const payload = await request.json();
        
        // Ensure this is an insert/update from blog_posts
        if (payload.table !== 'blog_posts' || !payload.record) {
            return NextResponse.json({ error: 'Invalid payload context.' }, { status: 400 });
        }

        const record = payload.record;
        
        // Only syndicate if status is strictly "published"
        if (record.status !== 'published') {
            return NextResponse.json({ success: true, message: 'Status is not published. Ignoring webhook.' });
        }

        const articleLink = `https://bimasakhi.com/blog/${record.slug}`;
        const socialSnippet = `New update from Bima Sakhi! ${record.meta_description || ''} Read the full opportunity here: ${articleLink}`;

        // 1. ZOHO SOCIAL DISTRIBUTION (via Zoho Flow or similar webhook target config)
        if (process.env.ZOHO_SOCIAL_WEBHOOK_URL) {
            await fetch(process.env.ZOHO_SOCIAL_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: socialSnippet, url: articleLink })
            }).catch(e => console.error("Zoho Social hook failed:", e));
        }

        // 2. MEDIUM POSTING (Canonical Tagged via Medium integration JSON structure)
        if (process.env.MEDIUM_API_TOKEN && process.env.MEDIUM_AUTHOR_ID) {
            await fetch(`https://api.medium.com/v1/users/${process.env.MEDIUM_AUTHOR_ID}/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.MEDIUM_API_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    title: record.title,
                    contentFormat: "html",
                    content: `<h1>${record.title}</h1> <p>${record.content}</p> <br><p><em>Originally published at <a href="${articleLink}">Bima Sakhi</a></em></p>`,
                    canonicalUrl: articleLink,
                    tags: ["career", "women empowerment", "lic"],
                    publishStatus: "public"
                })
            }).catch(e => console.error("Medium publish failed:", e));
        }

        return NextResponse.json({ success: true, message: 'Syndication dispatched successfully.' });

    } catch (error) {
        console.error("Webhook processing error:", error.message);
        return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
    }
}
