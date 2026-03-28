import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    // The ConfigProvider will use fallback defaults, 
    // but having a 200 OK endpoint natively resolves SWR loops safely.
    return NextResponse.json({
        isAppPaused: false,
        isRedirectPaused: false,
        delhiOnlyMessage: 'Currently onboarding women from Delhi NCR only.',
        ctaText: 'Apply on WhatsApp',
        heroTitle: 'Become a LIC Agent',
        heroSubtitle: 'Government Backed Commission Career',
    });
}
