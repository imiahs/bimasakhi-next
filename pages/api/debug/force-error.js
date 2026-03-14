// api/debug/force-error.js
// Test route to validate Slack error alerting.
// BLOCKED in production environments for security.

import { withLogger } from '../_middleware/logger.js';

export default withLogger(async function handler(req, res) {
    // Block debug routes in production
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not Found' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Intentional 500 to trigger Slack alert
    throw new Error('Intentional test error — validating Slack alerting pipeline');
});
