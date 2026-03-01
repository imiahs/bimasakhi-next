// api/debug/force-error.js
// Temporary route to safely validate Slack error alerting.
// Intentionally throws 500 so withLogger triggers alertSlack().
// DELETE THIS FILE after Slack alerting is confirmed working.
import { withLogger } from '../_middleware/logger.js';

export default withLogger(async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Intentional 500 to trigger Slack alert
    throw new Error('Intentional test error — validating Slack alerting pipeline');
});
