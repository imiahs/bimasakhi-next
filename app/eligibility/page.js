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
            images: [{ url: 'https://bimasakhi.com/images/home/hero-bg.jpg' }],
            siteName: 'Bima Sakhi',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'योग्यता चेक करें – Bima Sakhi',
            description: '10वीं पास | 18-70 वर्ष | दिल्ली NCR।',
            images: ['https://bimasakhi.com/images/home/hero-bg.jpg'],
        },
    };

    return await getSeoMetadata('/eligibility', defaultMetadata);
}

export default function EligibilityPage() {
    return <EligibilityContent />;
}
