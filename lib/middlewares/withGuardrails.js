import { NextResponse } from 'next/server';
import { rateLimit } from '@/utils/rateLimiter';
import { systemLogger } from '@/lib/logger/systemLogger';

const MAX_PAYLOAD_SIZE = 1 * 1024 * 1024; // 1MB
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds

export function withGuardrails(handler, options = {}) {
    return async (req, ...args) => {
        try {
            // 1. Size Limit Guard
            const contentLength = req.headers.get('content-length');
            if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
                return NextResponse.json({ error: 'Payload Too Large. Maximum size is 1MB.' }, { status: 413 });
            }

            // 2. IP Rate Limiting Guard
            if (options.rateLimit) {
                const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
                const limitOpts = options.rateLimitOptions || { limit: 5, window: 60 };
                const rateResult = await rateLimit(`api:${req.nextUrl.pathname}:${ip}`, limitOpts.limit, limitOpts.window);

                if (!rateResult.success) {
                    systemLogger.logWarning('RateLimiter', `Burst detected on ${req.nextUrl.pathname} from IP ${ip}`);
                    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
                }
            }

            // 3. Timeout Guard
            const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request Timeout Excceeded')), timeoutMs)
            );

            // Execute handler with race condition against timeout
            const response = await Promise.race([
                handler(req, ...args),
                timeoutPromise
            ]);

            return response;

        } catch (error) {
            console.error('[Guardrails Exception]', error);

            if (error.message === 'Request Timeout Excceeded') {
                return NextResponse.json({ error: 'Gateway Timeout' }, { status: 504 });
            }

            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    };
}
