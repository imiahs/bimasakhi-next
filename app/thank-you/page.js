import ThankYouContent from './ThankYouContent';

export const metadata = {
    title: 'Application Received – Bima Sakhi',
    description: 'Your application has been successfully received. Continue on WhatsApp for confirmation.',
    alternates: { canonical: 'https://bimasakhi.com/thank-you' },
    robots: { index: false, follow: false },
};

export default function ThankYouPage() {
    return <ThankYouContent />;
}
