import { withAuth, redis } from './_middleware/auth.js';
import { withLogger } from './_middleware/logger.js';

export default withLogger(withAuth(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Process Data
        const newConfig = req.body;

        if (typeof newConfig !== 'object' || newConfig === null) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        // Safe Merge (Read existing -> Merge -> Write)
        const rawConfig = await redis.get('config:global');
        const currentConfig = rawConfig ? JSON.parse(rawConfig) : {};

        const mergedConfig = { ...currentConfig, ...newConfig };

        // Store as Stringified JSON
        await redis.set('config:global', JSON.stringify(mergedConfig));

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Config Save Error:', error);
        return res.status(500).json({ error: 'Failed to update config' });
    }
}));
