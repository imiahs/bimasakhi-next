import AdsLandingContent from './AdsLandingContent';

export const metadata = {
    title: 'Bima Sakhi Delhi – Commission Based LIC Career for Women',
    description: 'Join Bima Sakhi LIC agency opportunity in Delhi, Noida & Ghaziabad. 3-year stipend support + commission-based career. Apply if serious.',
    alternates: { canonical: 'https://bimasakhi.com/bima-sakhi-delhi' },
    openGraph: {
        title: 'Bima Sakhi Delhi – Commission Based LIC Career for Women',
        description: 'Join Bima Sakhi LIC agency opportunity in Delhi, Noida & Ghaziabad.',
        url: 'https://bimasakhi.com/bima-sakhi-delhi',
        images: [{ url: 'https://bimasakhi.com/images/home/community.jpg' }],
        siteName: 'Bima Sakhi',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Bima Sakhi Delhi – LIC Career for Women',
        description: 'Join Bima Sakhi LIC agency opportunity in Delhi, Noida & Ghaziabad.',
        images: ['https://bimasakhi.com/images/home/community.jpg'],
    },
};

export default function AdsLandingPage() {
    return <AdsLandingContent />;
}
