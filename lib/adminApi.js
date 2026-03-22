// Central Data Layer for Admin UI
const BASE_ADMIN = '/api/admin';
const BASE_ADMIN_DATA = '/api/admin-data';

async function fetcher(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
}

export const adminApi = {
    checkAuth: () => fetcher(`${BASE_ADMIN}?action=check`),
    login: (password) => fetcher(`${BASE_ADMIN}?action=login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }),
    logout: () => fetcher(`${BASE_ADMIN}?action=logout`, { method: 'POST' }),
    
    getSystemHealth: () => fetcher(`${BASE_ADMIN}?action=system-health`),
    getBusinessMetrics: () => fetcher(`${BASE_ADMIN}?action=business-metrics`),
    getLeads: () => fetcher(`${BASE_ADMIN_DATA}/leads-list`),
    getFailedLeads: () => fetcher(`${BASE_ADMIN}?action=get-failed`),
    retryFailed: () => fetcher(`${BASE_ADMIN}?action=retry-failed`, { method: 'POST' }),
    clearFailed: () => fetcher(`${BASE_ADMIN}?action=clear-failed`, { method: 'POST' }),
    getQueueStatus: () => fetcher(`${BASE_ADMIN}?action=queue-status`),
    getLogs: (type = '') => fetcher(`${BASE_ADMIN}?action=get-logs${type ? `&type=${type}` : ''}`),
    
    getAlerts: () => fetcher(`${BASE_ADMIN}?action=get-alerts`),
    getActionQueue: () => fetcher(`${BASE_ADMIN}?action=get-action-queue`),
    getRecommendations: () => fetcher(`${BASE_ADMIN}?action=get-recommendations`),
    
    markConverted: (lead_id, conversion_value) => fetcher(`${BASE_ADMIN}?action=mark-converted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id, conversion_value })
    }),
    
    getConfig: () => fetcher(`${BASE_ADMIN_DATA}/config-get`),
    saveConfig: (config) => fetcher(`${BASE_ADMIN_DATA}/config-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    }),
    getStats: () => fetcher(`${BASE_ADMIN_DATA}/stats`)
};
