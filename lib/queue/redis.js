// lib/queue/redis.js
import Redis from 'ioredis';
import { metricsBatcher } from '../telemetry/metricsBatcher.js';

// Singleton Redis connection pattern
let connection = null;

export const getRedisConnection = () => {
    // Prevent NextJS build execution timeouts entirely
    if (process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build') {
        return null;
    }

    if (!connection) {
        let redisConfig = {};
        
        if (process.env.REDIS_URL) {
            redisConfig = process.env.REDIS_URL;
        } else {
            redisConfig = {
                host: process.env.REDIS_HOST || '127.0.0.1',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || ''
            };
        }

        try {
            const options = {
                maxRetriesPerRequest: null, // Required by BullMQ natively
                retryStrategy(times) {
                    return Math.min(times * 50, 2000);
                }
            };

            connection = typeof redisConfig === 'string' 
                ? new Redis(redisConfig, options) 
                : new Redis({ ...redisConfig, ...options });

            connection.on('error', (err) => {
                console.error('Redis Connection Error:', err);
            });
        } catch (e) {
            console.warn('Failed to instantly hook Redis bounds.');
        }
    }
    return connection;
};

export const checkRedisStatus = async () => {
    if (process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build') {
        return { redis_status: 'offline' };
    }
    try {
        const conn = getRedisConnection();
        if (!conn) return { redis_status: 'offline' };

        const start = Date.now();
        // Timeout ping after 2 seconds to not block
        const res = await Promise.race([
            conn.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        const latency = Date.now() - start;

        if (res === 'PONG') {
            metricsBatcher.recordRedisLatency(latency);
            return { redis_status: 'online', redis_latency_ms: latency };
        }
        return { redis_status: 'offline', redis_latency_ms: 0 };
    } catch (error) {
        return { redis_status: 'offline', redis_latency_ms: 0 };
    }
};
