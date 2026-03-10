import { getRedisConnection } from '@/lib/queue/redis';

export async function rateLimit(identifier, limit = 5, windowSeconds = 60) {
    const redis = getRedisConnection();

    if (!redis) {
        console.warn('Redis not configured. Skipping rate limiting.');
        return { success: true };
    }

    try {
        const key = `rate_limit:${identifier}`;
        const currentCount = await redis.incr(key);

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
