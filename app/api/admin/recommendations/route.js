import { NextResponse } from 'next/server';
import { generateRecommendations } from '@/lib/intelligenceEngine';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const recommendations = await generateRecommendations();
        return NextResponse.json({ success: true, data: recommendations });
    } catch (error) {
        console.error('Recommendations API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate recommendations' }, { status: 500 });
    }
});
