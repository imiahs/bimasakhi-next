import ContactContent from './ContactContent';

export const metadata = {
    title: 'Contact Bima Sakhi | Raj Kumar (Since 2013)',
    description: 'Get structured guidance for LIC agency, IC-38 exam preparation, documentation support and onboarding assistance.',
    alternates: { canonical: 'https://bimasakhi.com/contact' },
    openGraph: {
        title: 'Contact Bima Sakhi | Raj Kumar (Since 2013)',
        description: 'Get structured guidance for LIC agency, IC-38 exam preparation, documentation support.',
        url: 'https://bimasakhi.com/contact',
        images: [{ url: 'https://bimasakhi.com/images/home/hero-bg.jpg' }],
        siteName: 'Bima Sakhi',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Contact Bima Sakhi | Raj Kumar',
        description: 'Get structured guidance for LIC agency.',
        images: ['https://bimasakhi.com/images/home/hero-bg.jpg'],
    },
};

export default function ContactPage() {
    return <ContactContent />;
}
