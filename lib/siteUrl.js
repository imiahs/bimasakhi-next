const CANONICAL_SITE_URL = 'https://bimasakhi.com';

function normalizeSiteUrl(url) {
    return url ? url.replace(/\/$/, '') : url;
}

export function getSiteUrl() {
    if (process.env.NODE_ENV === 'production') {
        return CANONICAL_SITE_URL;
    }

    const configuredSiteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_BASE_URL;

    if (configuredSiteUrl) {
        return normalizeSiteUrl(configuredSiteUrl);
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return 'http://localhost:3000';
}