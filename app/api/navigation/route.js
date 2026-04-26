import { NextResponse } from 'next/server';
import { getNavigationMenu } from '@/lib/navigation/getNavigationMenu';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const menu = await getNavigationMenu();

        return NextResponse.json(
            { success: true, menu },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    } catch (error) {
        console.error('API /navigation GET error:', error);

        return NextResponse.json(
            { success: false, error: 'Failed to fetch navigation menu' },
            { status: 500 }
        );
    }
}
