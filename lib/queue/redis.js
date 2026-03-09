// lib/queue/redis.js
import Redis from 'ioredis';

// Singleton Redis connection pattern
let connection = null;

export const getRedisConnection = () => {
    // Prevent NextJS build execution timeouts entirely
    if (process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build') {
        return null;
    }

    if (!connection) {
        const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
        const REDIS_PORT = process.env.REDIS_PORT || 6379;
        const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

        // Only throw valid connection logic mapping natively 
        try {
            connection = new Redis({
                host: REDIS_HOST,
                port: REDIS_PORT,
                password: REDIS_PASSWORD,
                maxRetriesPerRequest: null, // Required by BullMQ natively
                retryStrategy(times) {
                    return Math.min(times * 50, 2000);
                }
            });

            connection.on('error', (err) => {
                console.error('Redis Connection Error:', err);
            });
        } catch (e) {
            console.warn('Failed to instantly hook Redis bounds.');
        }
    }
    return connection;
};
