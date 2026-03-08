import IncomeCalculator from './IncomeCalculator';
import Script from 'next/script';

export const metadata = {
    title: 'LIC Agent Income Calculator | Estimate Your LIC Earnings',
    description: 'Use our free LIC Agent Income Calculator to estimate your first-year commission and monthly earning potential based on policy sales.',
    alternates: {
        canonical: 'https://bimasakhi.com/tools/lic-income-calculator',
    },
    openGraph: {
        title: 'LIC Agent Income Calculator | Estimate Your LIC Earnings',
        description: 'Use our free LIC Agent Income Calculator to estimate your first-year commission and monthly earning potential based on policy sales.',
        url: 'https://bimasakhi.com/tools/lic-income-calculator',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'LIC Agent Income Calculator | Estimate Your LIC Earnings',
        description: 'Use our free LIC Agent Income Calculator to estimate your first-year commission and monthly earning potential based on policy sales.',
    },
};

export default function IncomeCalculatorPage() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': 'LIC Agent Income Calculator',
        'operatingSystem': 'Any',
        'applicationCategory': 'BusinessApplication',
        'description': 'Calculate potential income and first-year commissions as an LIC agent or Bima Sakhi.',
        'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'INR',
        },
    };

    return (
        <>
            <Script
                id="schema-income-calculator"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <IncomeCalculator />
        </>
    );
}
