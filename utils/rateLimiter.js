import { getRedisConnection } from '@/lib/queue/redis';

const memoryStore = new Map();

export async function rateLimit(identifier, limit = 5, windowSeconds = 60) {
    const redis = getRedisConnection();
    const key = `rate_limit:${identifier}`;
    const now = Date.now();

    // Memory Fallback Strategy
    const fallbackToMemory = () => {
        let record = memoryStore.get(key) || { count: 0, startTime: now };
        if (now - record.startTime > windowSeconds * 1000) {
            record = { count: 0, startTime: now }; // reset
        }
        record.count++;
        memoryStore.set(key, record);

        if (record.count > limit) {
            return { success: false, limit, remaining: 0, reset: windowSeconds };
        }
        return { success: true, limit, remaining: limit - record.count, reset: windowSeconds };
    };

    if (!redis) {
        console.warn('Redis not available. Falling back to in-memory rate limiting.');
        return fallbackToMemory();
    }

    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Redis operation timed out")), 2000)
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
        console.error('Rate Limiter Error (Redis):', error.message, '- Falling back to memory store.');
        return fallbackToMemory();
    }
}
