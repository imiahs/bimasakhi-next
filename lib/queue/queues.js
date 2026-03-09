import { Queue } from 'bullmq';
import { getRedisConnection } from './redis.js';

let _pageGeneratorQueue = null;
let _contentAuditQueue = null;
let _indexQueue = null;
let _cacheQueue = null;
let _crawlBudgetQueue = null;

export const getPageGeneratorQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_pageGeneratorQueue) {
        _pageGeneratorQueue = new Queue('PageGeneratorQueue', { connection: conn });
    }
    return _pageGeneratorQueue;
};

export const getContentAuditQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_contentAuditQueue) {
        _contentAuditQueue = new Queue('ContentAuditQueue', { connection: conn });
    }
    return _contentAuditQueue;
};

export const getIndexQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_indexQueue) {
        _indexQueue = new Queue('IndexQueue', { connection: conn });
    }
    return _indexQueue;
};

export const getCacheQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_cacheQueue) {
        _cacheQueue = new Queue('CacheQueue', { connection: conn });
    }
    return _cacheQueue;
};

export const getCrawlBudgetQueue = () => {
    const conn = getRedisConnection();
    if (!conn) return null;
    if (!_crawlBudgetQueue) {
        _crawlBudgetQueue = new Queue('CrawlBudgetQueue', { connection: conn });
    }
    return _crawlBudgetQueue;
};
