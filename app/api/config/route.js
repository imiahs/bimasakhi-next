import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Explicit analytics contract:
    // - isAnalyticsEnabled controls GA4/GTM injection (requires real IDs)
    // - First-party telemetry (/api/events) works independently
    return NextResponse.json({
        isAppPaused: false,
        isRedirectPaused: false,
        delhiOnlyMessage: 'Currently onboarding women from Delhi NCR only.',
        ctaText: 'Apply on WhatsApp',
        heroTitle: 'Become a LIC Agent',
        heroSubtitle: 'Government Backed Commission Career',
        // Analytics contract — explicit, not implicit
        isAnalyticsEnabled: Boolean(process.env.GA_MEASUREMENT_ID || process.env.GTM_CONTAINER_ID),
        gaMeasurementId: process.env.GA_MEASUREMENT_ID || '',
        gtmContainerId: process.env.GTM_CONTAINER_ID || '',
    });
}
