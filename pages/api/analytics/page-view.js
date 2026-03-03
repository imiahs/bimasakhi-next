// pages/api/analytics/page-view.js
// Lightweight page view counter using Upstash Redis
import { redis } from '../_middleware/auth.js';

export default async function handler(req, res) {
    const { method } = req;

    if (method === 'POST') {
        // Increment counter for a specific page
        const { page } = req.body;
        if (!page || typeof page !== 'string') {
            return res.status(400).json({ error: 'Missing page parameter' });
        }

        const sanitizedPage = page.replace(/[^a-zA-Z0-9\-\/]/g, '').substring(0, 50);
        const key = `page_views:${sanitizedPage}`;
        const total = await redis.incr(key);

        return res.status(200).json({ page: sanitizedPage, views: total });

    } else if (method === 'GET') {
        // Get counter for a specific page
        const { page } = req.query;
        if (!page) {
            return res.status(400).json({ error: 'Missing page parameter' });
        }

        const sanitizedPage = page.replace(/[^a-zA-Z0-9\-\/]/g, '').substring(0, 50);
        const key = `page_views:${sanitizedPage}`;
        const total = await redis.get(key);

        return res.status(200).json({ page: sanitizedPage, views: parseInt(total) || 0 });

    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
}
