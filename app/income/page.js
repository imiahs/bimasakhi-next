import IncomeContent from './IncomeContent';

export const metadata = {
    title: 'कमाई की सच्चाई – Commission vs Salary',
    description: 'यह जॉब नहीं, बिज़नेस है। जानिए कमीशन स्ट्रक्चर और परफॉरमेंस-आधारित स्टाइपेंड की सच्चाई।',
    alternates: { canonical: 'https://bimasakhi.com/income' },
    openGraph: {
        title: 'कमाई की सच्चाई – Commission vs Salary',
        description: 'यह जॉब नहीं, बिज़नेस है। जानिए कमीशन स्ट्रक्चर और परफॉरमेंस-आधारित स्टाइपेंड की सच्चाई।',
        url: 'https://bimasakhi.com/income',
        images: [{ url: 'https://bimasakhi.com/images/home/hero-bg.jpg' }],
        siteName: 'Bima Sakhi',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'कमाई की सच्चाई – Commission vs Salary',
        description: 'यह जॉब नहीं, बिज़नेस है।',
        images: ['https://bimasakhi.com/images/home/hero-bg.jpg'],
    },
};

export default function IncomePage() {
    return <IncomeContent />;
}
