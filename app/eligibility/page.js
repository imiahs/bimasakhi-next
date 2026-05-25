import EligibilityContent from './EligibilityContent';

import { getSeoMetadata } from '@/utils/seo';

export const revalidate = 3600;

export async function generateMetadata() {
    const defaultMetadata = {
        title: 'योग्यता चेक करें – Bima Sakhi (Delhi NCR)',
        description: '10वीं पास | 18-70 वर्ष | दिल्ली NCR। अपनी एलिजिबिलिटी चेक करें और अप्लाई करें।',
        alternates: { canonical: 'https://bimasakhi.com/eligibility' },
        openGraph: {
            title: 'योग्यता चेक करें – Bima Sakhi (Delhi NCR)',
            description: '10वीं पास | 18-70 वर्ष | दिल्ली NCR। अपनी एलिजिबिलिटी चेक करें और अप्लाई करें।',
            url: 'https://bimasakhi.com/eligibility',
            images: [{ url: 'https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/hero/hero-bg-1779744603094.webp' }],
            siteName: 'Bima Sakhi',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'योग्यता चेक करें – Bima Sakhi',
            description: '10वीं पास | 18-70 वर्ष | दिल्ली NCR।',
            images: ['https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/hero/hero-bg-1779744603094.webp'],
        },
    };

    return await getSeoMetadata('/eligibility', defaultMetadata);
}

export default function EligibilityPage() {
    return <EligibilityContent />;
}
