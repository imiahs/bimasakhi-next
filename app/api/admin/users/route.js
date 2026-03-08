import { NextResponse } from 'next/server';

// Statically defined users for Phase 17
const STATIC_USERS = [
    { id: 1, name: 'Owner Admin', role: 'owner', email: 'admin@bimasakhi.com', active: true },
    { id: 2, name: 'Content Editor', role: 'editor', email: 'content@bimasakhi.com', active: true },
];

export async function GET() {
    try {
        return NextResponse.json({ users: STATIC_USERS });
    } catch (error) {
        console.error('API /admin/users GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
