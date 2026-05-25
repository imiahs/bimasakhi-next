import AboutContent from './AboutContent';

export const metadata = {
    title: 'About Raj Kumar | Bima Sakhi Platform',
    description: 'Learn about Raj Kumar, Development Officer since 2013, and the mission behind Bima Sakhi — empowering women through structured LIC career guidance.',
    alternates: { canonical: 'https://bimasakhi.com/about' },
    openGraph: {
        title: 'About Raj Kumar | Bima Sakhi Platform',
        description: 'Learn about Raj Kumar, Development Officer since 2013, and the mission behind Bima Sakhi.',
        url: 'https://bimasakhi.com/about',
        images: [{ url: 'https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/hero/hero-bg-1779744603094.webp' }],
        siteName: 'Bima Sakhi',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'About Raj Kumar | Bima Sakhi Platform',
        description: 'Learn about Raj Kumar, Development Officer since 2013.',
        images: ['https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/hero/hero-bg-1779744603094.webp'],
    },
};

export default function AboutPage() {
    return <AboutContent />;
}
