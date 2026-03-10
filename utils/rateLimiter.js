import { getRedisConnection } from '@/lib/queue/redis';

export async function rateLimit(identifier, limit = 5, windowSeconds = 60) {
    const redis = getRedisConnection();

    if (!redis || !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.warn('Redis not configured or missing Upstash ENV variables. Skipping rate limiting.');
        return { success: true };
    }

    try {
        const key = `rate_limit:${identifier}`;

        // Add a 3-second timeout to prevent Redis hanging Next.js
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Redis operation timed out")), 3000)
        );

        const currentCount = await Promise.race([
            redis.incr(key),
            timeoutPromise
        ]);

        if (currentCount === 1) {
            await redis.expire(key, windowSeconds);
        }

        if (currentCount > limit) {
            return {
                success: false,
                limit,
                remaining: 0,
                reset: windowSeconds
            };
        }

        return {
            success: true,
            limit,
            remaining: limit - currentCount,
            reset: windowSeconds
        };
    } catch (error) {
        console.error('Rate Limiter Error:', error);
        // Fail open if Redis is down
        return { success: true };
    }
}
