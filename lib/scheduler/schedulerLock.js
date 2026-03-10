import { getRedisConnection } from '../queue/redis.js';
import { systemLogger } from '../logger/systemLogger.js';

/**
 * Attempts to acquire a distributed lock using Redis `NX` (Not eXists).
 * @param {string} lockKey - Unique identifier for the lock.
 * @param {number} ttlSeconds - Time-To-Live in seconds.
 * @returns {Promise<boolean>} True if lock acquired, False if already locked.
 */
export async function acquireLock(lockKey, ttlSeconds = 300) {
    const redis = getRedisConnection();
    if (!redis) {
        systemLogger.logWarning('SchedulerLock', 'Redis unavailable. Bypassing lock mechanism.');
        // Fail open if Redis is down, allowing the cron to run. 
        // We could fail closed, but failing open ensures jobs run at least once if Redis is out.
        return true;
    }

    try {
        const acquired = await redis.set(lockKey, 'locked', 'EX', ttlSeconds, 'NX');
        return acquired === 'OK';
    } catch (e) {
        systemLogger.logError('SchedulerLock', 'Failed to acquire Redis lock', e.message);
        return true; // Fail open
    }
}

/**
 * Releases a previously acquired Redis lock.
 * @param {string} lockKey - Unique identifier for the lock.
 */
export async function releaseLock(lockKey) {
    const redis = getRedisConnection();
    if (!redis) return;

    try {
        await redis.del(lockKey);
    } catch (e) {
        systemLogger.logError('SchedulerLock', 'Failed to release Redis lock', e.message);
    }
}
