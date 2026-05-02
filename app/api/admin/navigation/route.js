import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import {
    buildNavigationTree,
    createNavigationItem,
    listNavigationItems,
    normalizeMenuKey,
    normalizeNavigationSlug,
    sanitizeNavigationInput,
} from '@/lib/navigation/getNavigationMenu';

export const dynamic = 'force-dynamic';

async function validateNavigationPayload(payload, { id = null } = {}) {
    const normalized = sanitizeNavigationInput(payload);

    if (!normalized.name) {
        return { error: 'Name is required.' };
    }

    if (normalized.is_cta && normalized.parent_id) {
        return { error: 'CTA items must be top-level items.' };
    }

    if (normalized.parent_id && normalized.parent_id === id) {
        return { error: 'An item cannot be its own parent.' };
    }

    if (normalized.parent_id) {
        const items = await listNavigationItems({
            includeInactive: true,
            menuKey: normalized.menu_key,
        });
        const parent = items.find((item) => item.id === normalized.parent_id);

        if (!parent) {
            return { error: 'Parent item must exist in the same menu.' };
        }

        if (parent.parent_id) {
            return { error: 'Only one level of nesting is supported.' };
        }

        if (normalized.menu_key !== 'public_header' && parent.slug) {
            return { error: 'Footer and admin sidebar children must use a top-level group parent.' };
        }
    }

    return { data: normalized };
}

export const GET = withAdminAuth(async (request) => {
    try {
        const menuKey = normalizeMenuKey(request.nextUrl.searchParams.get('menu'));
        const items = await listNavigationItems({ includeInactive: true, menuKey });
        return NextResponse.json({
            success: true,
            menuKey,
            items,
            tree: buildNavigationTree(items),
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}, ['super_admin']);

export const POST = withAdminAuth(async (request) => {
    try {
        const body = await request.json();
        const validation = await validateNavigationPayload(body);

        if (validation.error) {
            return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }

        const item = await createNavigationItem({
            ...validation.data,
            slug: normalizeNavigationSlug(validation.data.slug),
        });

        return NextResponse.json({ success: true, item });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}, ['super_admin']);