import DownloadsContent from './DownloadsContent';

export const metadata = {
    title: 'LIC Agent Study Materials & Resources | IC-38 Exam Guide | Bima Sakhi',
    description: 'Free LIC agent study materials, IC-38 exam preparation resources, model question papers, and official links. Prepare to become a LIC Bima Sakhi with structured guidance.',
    alternates: { canonical: 'https://bimasakhi.com/downloads' },
    openGraph: {
        title: 'LIC Agent Study Materials & Resources | Bima Sakhi',
        description: 'Free IC-38 exam preparation resources, study materials, and official links for LIC agent aspirants.',
        url: 'https://bimasakhi.com/downloads',
        images: [{ url: 'https://bimasakhi.com/images/home/hero-bg.jpg' }],
        siteName: 'Bima Sakhi',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'LIC Agent Study Materials & Resources | Bima Sakhi',
        description: 'Free IC-38 exam preparation resources and official links for LIC agent aspirants.',
        images: ['https://bimasakhi.com/images/home/hero-bg.jpg'],
    },
};

export default function DownloadsPage() {
    return <DownloadsContent />;
}
