import CommissionCalculator from './CommissionCalculator';
import Script from 'next/script';

export const metadata = {
    title: 'LIC Commission Calculator | First Year & Renewal Breakdown',
    description: 'Calculate exactly how much commission you will make on first-year premiums and subsequent renewal premiums as an LIC agent.',
    alternates: {
        canonical: 'https://bimasakhi.com/tools/lic-commission-calculator',
    },
    openGraph: {
        title: 'LIC Commission Calculator | First Year & Renewal Breakdown',
        description: 'Calculate exactly how much commission you will make on first-year premiums and subsequent renewal premiums as an LIC agent.',
        url: 'https://bimasakhi.com/tools/lic-commission-calculator',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'LIC Commission Calculator | First Year & Renewal Breakdown',
        description: 'Calculate exactly how much commission you will make on first-year premiums and subsequent renewal premiums as an LIC agent.',
    },
};

export default function CommissionCalculatorPage() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': 'LIC Commission Calculator',
        'operatingSystem': 'Any',
        'applicationCategory': 'BusinessApplication',
        'description': 'Calculate exact first-year and renewal commission brackets for LIC policies.',
        'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'INR',
        },
    };

    return (
        <>
            <Script
                id="schema-commission-calculator"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <CommissionCalculator />
        </>
    );
}
