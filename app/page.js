// Homepage — app/page.js
// Uses generateMetadata for server-side OG tags
// The HomePage component is a client component (imported)

import HomePageContent from '@/features/dynamic-home/HomePage';

import { getSeoMetadata } from '@/utils/seo';

export const revalidate = 3600;

export async function generateMetadata() {
  const defaultMetadata = {
    title: 'Bima Sakhi - LIC Agency Career for Women (Delhi NCR)',
    description: 'Opportunity for women to start an independent LIC agency in Delhi NCR. No fixed salary, full commission-based career.',
    alternates: { canonical: 'https://bimasakhi.com/' },
    openGraph: {
      title: 'Bima Sakhi - LIC Agency Career for Women (Delhi NCR)',
      description: 'Opportunity for women to start an independent LIC agency in Delhi NCR. No fixed salary, full commission-based career.',
      url: 'https://bimasakhi.com/',
      images: [{ url: 'https://bimasakhi.com/images/home/hero-bg.jpg' }],
      siteName: 'Bima Sakhi',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Bima Sakhi - LIC Agency Career for Women (Delhi NCR)',
      description: 'Opportunity for women to start an independent LIC agency in Delhi NCR.',
      images: ['https://bimasakhi.com/images/home/hero-bg.jpg'],
    },
  };

  return await getSeoMetadata('/', defaultMetadata);
}

export default function Home() {
  return <HomePageContent />;
}
