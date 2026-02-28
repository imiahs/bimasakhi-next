/**
 * Structured API Logging Middleware
 * 
 * Wraps any Vercel serverless handler to emit structured JSON logs
 * with method, route, IP, status, and execution duration.
 *
 * Usage:
 *   export default withLogger(async (req, res) => { ... });
 *   export default withLogger(withAuth(async (req, res) => { ... }));
 */
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

            // Only send 500 if response hasn't been sent yet
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    };
}
