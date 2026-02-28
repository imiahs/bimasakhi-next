// Health Check Utility
// Intended to be run from Console or Hidden Admin Route

export const getSystemHealth = () => {
    const report = {
        timestamp: new Date().toISOString(),
        env: {
            mode: process.env.NEXT_PUBLIC_DYNAMIC_HOME_MODE,
            rolloutPct: process.env.NEXT_PUBLIC_DYNAMIC_ROLLOUT_PERCENTAGE,
            isDev: process.env.NODE_ENV === 'development'
        },
        session: {
            circuitBreaker: sessionStorage.getItem('dynamic_home_failures') || '0',
            rolloutBucket: sessionStorage.getItem('dynamic_rollout_val') || 'N/A',
            hasCache: !!sessionStorage.getItem('homepage_sections_cache')
        },
        localMetrics: {
            renders: localStorage.getItem('metric_DYNAMIC_RENDER'),
            fallbacks: localStorage.getItem('metric_STATIC_FALLBACK')
        }
    };

    console.table(report.session);
    return report;
};
