import Redis from 'ioredis';

// Initialize Redis outside handler for connection reuse
const redisUrl = process.env.REDIS_URL;
let redis = null;

if (redisUrl) {
    try {
        redis = new Redis(redisUrl);
    } catch (e) {
        console.warn("Redis Init Failed:", e.message);
    }
} else {
    // Provide a dummy mock if Redis is completely missing to prevent crashes
    redis = {
        get: async () => null,
        set: async () => true,
        del: async () => 1,
        incr: async () => 1,
        expire: async () => 1,
        ping: async () => 'PONG'
    };
}

export { redis };
