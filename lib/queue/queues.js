import { Queue } from 'bullmq';
import { getRedisConnection } from './redis.js';

let _pageGeneratorQueue = null;
let _contentAuditQueue = null;
let _indexQueue = null;
let _cacheQueue = null;
let _crawlBudgetQueue = null;
let _networkMetricsQueue = null;

export const getPageGeneratorQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_pageGeneratorQueue) {
        _pageGeneratorQueue = new Queue('PageGeneratorQueue', { connection: conn, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
    }
    return _pageGeneratorQueue;
};

export const getContentAuditQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_contentAuditQueue) {
        _contentAuditQueue = new Queue('ContentAuditQueue', { connection: conn, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
    }
    return _contentAuditQueue;
};

export const getIndexQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_indexQueue) {
        _indexQueue = new Queue('IndexQueue', { connection: conn, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
    }
    return _indexQueue;
};

export const getCacheQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_cacheQueue) {
        _cacheQueue = new Queue('CacheQueue', { connection: conn, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
    }
    return _cacheQueue;
};

export const getCrawlBudgetQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_crawlBudgetQueue) {
        _crawlBudgetQueue = new Queue('CrawlBudgetQueue', { connection: conn, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
    }
    return _crawlBudgetQueue;
};

export const getNetworkMetricsQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_networkMetricsQueue) {
        _networkMetricsQueue = new Queue('NetworkMetricsQueue', { connection: conn, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
    }
    return _networkMetricsQueue;
};
