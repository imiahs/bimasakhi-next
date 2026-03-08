import { getServiceSupabase } from './supabase';

export async function getSeoMetadata(pagePath, defaultMetadata) {
    try {
        const supabase = getServiceSupabase();

        const { data } = await supabase
            .from('seo_overrides')
            .select('*')
            .eq('page_path', pagePath)
            .single();

        if (data) {
            return {
                ...defaultMetadata,
                title: data.meta_title || defaultMetadata.title,
                description: data.meta_description || defaultMetadata.description,
                openGraph: {
                    ...defaultMetadata.openGraph,
                    title: data.meta_title || defaultMetadata.openGraph?.title,
                    description: data.meta_description || defaultMetadata.openGraph?.description,
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
