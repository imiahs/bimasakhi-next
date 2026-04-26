// Central Data Layer for Admin UI
const BASE_ADMIN = '/api/admin';

async function fetcher(url, options = {}) {
    const defaultOptions = {
        ...options,
        credentials: 'include'
    };
    const res = await fetch(url, defaultOptions);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
}

export const adminApi = {
    checkAuth: () => fetcher(`${BASE_ADMIN}/check`),
    login: (email, password) => fetcher(`${BASE_ADMIN}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }),
    logout: () => fetcher(`${BASE_ADMIN}/logout`, { method: 'POST' }),
    
    getSystemHealth: () => fetcher(`${BASE_ADMIN}/system-health`),
    getBusinessMetrics: () => fetcher(`${BASE_ADMIN}/metrics`),
    getLeads: () => fetcher(`${BASE_ADMIN}/leads`),
    getFailedLeads: () => fetcher(`${BASE_ADMIN}/failed`),
    retryFailed: () => fetcher(`${BASE_ADMIN}/failed/retry`, { method: 'POST' }),
    clearFailed: () => fetcher(`${BASE_ADMIN}/failed/clear`, { method: 'POST' }),
    getQueueStatus: () => fetcher(`${BASE_ADMIN}/queue`),
    getLogs: (type = '') => fetcher(`${BASE_ADMIN}/logs${type ? `?type=${type}` : ''}`),
    
    getAlerts: () => fetcher(`${BASE_ADMIN}/alerts`),
    getActionQueue: () => fetcher(`${BASE_ADMIN}/action-queue`),
    getRecommendations: () => fetcher(`${BASE_ADMIN}/recommendations`),
    
    markConverted: (lead_id, conversion_value) => fetcher(`${BASE_ADMIN}/leads/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id, conversion_value })
    }),
    
    getConfig: () => fetcher(`${BASE_ADMIN}/config`),
    saveConfig: (config) => fetcher(`${BASE_ADMIN}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    }),
    getStats: () => fetcher(`${BASE_ADMIN}/stats`)
};
