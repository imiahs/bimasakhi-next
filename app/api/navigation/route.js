import { NextResponse } from 'next/server';
import { getNavigationMenu, normalizeMenuKey } from '@/lib/navigation/getNavigationMenu';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const menuKey = normalizeMenuKey(request.nextUrl.searchParams.get('menu'));
        const menu = await getNavigationMenu({ menuKey });

        return NextResponse.json(
            { success: true, menuKey, menu },
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
