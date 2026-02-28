import ApplyContent from './ApplyContent';

export const metadata = {
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

export default function ApplyPage() {
    return <ApplyContent />;
}
