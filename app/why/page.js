import WhyContent from './WhyContent';

import { getSeoMetadata } from '@/utils/seo';

export const revalidate = 3600;

export async function generateMetadata() {
    const defaultMetadata = {
        title: 'Why Become Bima Sakhi? – LIC Career Benefits & Mahilaon Ke Liye Income Opportunity',
        description: 'Discover why becoming a Bima Sakhi LIC agent is a smart career move for women in Delhi NCR. Flexible income, ghar se kaam, social respect aur long-term financial growth.',
        alternates: { canonical: 'https://bimasakhi.com/why' },
        openGraph: {
            title: 'Why Become Bima Sakhi? – LIC Career Benefits & Mahilaon Ke Liye Income Opportunity',
            description: 'Discover why becoming a Bima Sakhi LIC agent is a smart career move for women in Delhi NCR.',
            url: 'https://bimasakhi.com/why',
            images: [{ url: 'https://bimasakhi.com/images/bima_sakhi_ai.png' }],
            siteName: 'Bima Sakhi',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Why Become Bima Sakhi? – LIC Career Benefits',
            description: 'Discover why becoming a Bima Sakhi LIC agent is a smart career move for women in Delhi NCR.',
            images: ['https://bimasakhi.com/images/bima_sakhi_ai.png'],
        },
    };

    return await getSeoMetadata('/why', defaultMetadata);
}

export default function WhyPage() {
    return <WhyContent />;
}
