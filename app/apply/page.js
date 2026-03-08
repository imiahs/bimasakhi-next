import ApplyContent from './ApplyContent';

import { getSeoMetadata } from '@/utils/seo';

export const revalidate = 3600;

export async function generateMetadata() {
    const defaultMetadata = {
        title: 'अभी अप्लाई करें – Bima Sakhi Application Form',
        description: '2 मिनट में अप्लाई करें। LIC के साथ जुड़कर आत्मनिर्भर बनें। सुरक्षित और आसान प्रोसेस।',
        alternates: { canonical: 'https://bimasakhi.com/apply' },
        openGraph: {
            title: 'अभी अप्लाई करें – Bima Sakhi Application Form',
            description: '2 मिनट में अप्लाई करें। LIC के साथ जुड़कर आत्मनिर्भर बनें।',
            url: 'https://bimasakhi.com/apply',
            images: [{ url: 'https://bimasakhi.com/images/home/hero-bg.jpg' }],
            siteName: 'Bima Sakhi',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'अभी अप्लाई करें – Bima Sakhi',
            description: '2 मिनट में अप्लाई करें।',
            images: ['https://bimasakhi.com/images/home/hero-bg.jpg'],
        },
    };

    return await getSeoMetadata('/apply', defaultMetadata);
}

export default function ApplyPage() {
    return <ApplyContent />;
}
