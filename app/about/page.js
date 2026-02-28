import AboutContent from './AboutContent';

export const metadata = {
    title: 'About Raj Kumar | Bima Sakhi Platform',
    description: 'Learn about Raj Kumar, Development Officer since 2013, and the mission behind Bima Sakhi — empowering women through structured LIC career guidance.',
    alternates: { canonical: 'https://bimasakhi.com/about' },
    openGraph: {
        title: 'About Raj Kumar | Bima Sakhi Platform',
        description: 'Learn about Raj Kumar, Development Officer since 2013, and the mission behind Bima Sakhi.',
        url: 'https://bimasakhi.com/about',
        images: [{ url: 'https://bimasakhi.com/images/home/hero-bg.jpg' }],
        siteName: 'Bima Sakhi',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'About Raj Kumar | Bima Sakhi Platform',
        description: 'Learn about Raj Kumar, Development Officer since 2013.',
        images: ['https://bimasakhi.com/images/home/hero-bg.jpg'],
    },
};

export default function AboutPage() {
    return <AboutContent />;
}
