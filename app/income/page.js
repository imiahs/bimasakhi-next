import IncomeContent from './IncomeContent';

import { getSeoMetadata } from '@/utils/seo';

export const revalidate = 3600;

export async function generateMetadata() {
    const defaultMetadata = {
        title: 'कमाई की सच्चाई – Commission vs Salary',
        description: 'यह जॉब नहीं, बिज़नेस है। जानिए कमीशन स्ट्रक्चर और परफॉरमेंस-आधारित स्टाइपेंड की सच्चाई।',
        alternates: { canonical: 'https://bimasakhi.com/income' },
        openGraph: {
            title: 'कमाई की सच्चाई – Commission vs Salary',
            description: 'यह जॉब नहीं, बिज़नेस है। जानिए कमीशन स्ट्रक्चर और परफॉरमेंस-आधारित स्टाइपेंड की सच्चाई।',
            url: 'https://bimasakhi.com/income',
            images: [{ url: 'https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/hero/hero-bg-1779744603094.webp' }],
            siteName: 'Bima Sakhi',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'कमाई की सच्चाई – Commission vs Salary',
            description: 'यह जॉब नहीं, बिज़नेस है।',
            images: ['https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/hero/hero-bg-1779744603094.webp'],
        },
    };

    return await getSeoMetadata('/income', defaultMetadata);
}

export default function IncomePage() {
    return <IncomeContent />;
}
