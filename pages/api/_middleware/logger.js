/**
 * Structured API Logging Middleware
 * 
 * Wraps any Vercel serverless handler to emit structured JSON logs
 * with method, route, IP, status, and execution duration.
 * 
 * Also sends Slack alerts on 5xx errors (fire-and-forget).
 *
 * Usage:
 *   export default withLogger(async (req, res) => { ... });
 *   export default withLogger(withAuth(async (req, res) => { ... }));
 */

// --- Slack Alert (fire-and-forget) ---
function alertSlack({ method, route, status, error, duration_ms }) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const timestamp = new Date().toISOString();
    const text = [
        `🔴 *API Error*`,
        `*Method:* \`${method}\``,
        `*Route:* \`${route}\``,
        `*Status:* ${status}`,
        `*Error:* ${error || 'Unknown'}`,
        `*Duration:* ${duration_ms}ms`,
        `*Time:* ${timestamp}`
    ].join('\n');

    fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    }).catch(() => { }); // fire-and-forget, never block the response
}

export function withLogger(handler) {
    return async (req, res) => {
        const start = Date.now();
        const method = req.method;
        const route = req.url;
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

        // Intercept res.status() to capture the status code
        let statusCode = 200; // default
        const originalStatus = res.status.bind(res);
        res.status = (code) => {
            statusCode = code;
            return originalStatus(code);
        };

        try {
            await handler(req, res);

            const duration_ms = Date.now() - start;
            console.info(JSON.stringify({
                type: 'api_request',
                method,
                route,
                ip,
                status: statusCode,
                duration_ms
            }));

            // Alert on 5xx responses
            if (statusCode >= 500) {
                alertSlack({ method, route, status: statusCode, error: 'Handler returned 5xx', duration_ms });
            }
        } catch (error) {
            const duration_ms = Date.now() - start;
            console.error(JSON.stringify({
                type: 'api_error',
                method,
                route,
                ip,
                error: error.message || 'Unknown error',
                duration_ms
            }));

            // Alert on unhandled errors
            alertSlack({ method, route, status: 500, error: error.message || 'Unhandled exception', duration_ms });

            // Only send 500 if response hasn't been sent yet
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    };
}
