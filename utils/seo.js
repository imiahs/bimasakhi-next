import { getServiceSupabase } from './supabase';

function normalizeRoutePath(pagePath) {
    const rawPath = typeof pagePath === 'string' ? pagePath.trim() : '';

    if (!rawPath || rawPath === '/') {
        return '/';
    }

    return `/${rawPath.replace(/^\/+|\/+$/g, '')}`;
}

export function getRobotsMetadata(robotsSetting, defaultRobots) {
    if (!robotsSetting) {
        return defaultRobots;
    }

    const normalized = String(robotsSetting).toLowerCase();

    return {
        index: !normalized.includes('noindex'),
        follow: !normalized.includes('nofollow'),
    };
}

export async function getSeoMetadata(pagePath, defaultMetadata) {
    try {
        const supabase = getServiceSupabase();
        const routePath = normalizeRoutePath(pagePath);

        const { data } = await supabase
            .from('seo_overrides')
            .select('*')
            .eq('route_path', routePath)
            .maybeSingle();

        if (data) {
            return {
                ...defaultMetadata,
                title: data.meta_title || defaultMetadata.title,
                description: data.meta_description || defaultMetadata.description,
                alternates: {
                    ...defaultMetadata.alternates,
                    canonical: data.canonical_url || defaultMetadata.alternates?.canonical,
                },
                robots: getRobotsMetadata(data.robots_setting, defaultMetadata.robots),
                openGraph: {
                    ...defaultMetadata.openGraph,
                    title: data.meta_title || defaultMetadata.openGraph?.title,
                    description: data.meta_description || defaultMetadata.openGraph?.description,
                    url: data.canonical_url || defaultMetadata.openGraph?.url,
                    images: data.og_image ? [{ url: data.og_image }] : defaultMetadata.openGraph?.images
                },
                twitter: {
                    ...defaultMetadata.twitter,
                    title: data.meta_title || defaultMetadata.twitter?.title,
                    description: data.meta_description || defaultMetadata.twitter?.description,
                    images: data.og_image ? [data.og_image] : defaultMetadata.twitter?.images
                }
            };
        }

        return defaultMetadata;
    } catch (error) {
        console.error(`Error fetching SEO override for ${pagePath}:`, error);
        return defaultMetadata;
    }
}
