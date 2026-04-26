import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import {
    buildNavigationTree,
    createNavigationItem,
    listNavigationItems,
    normalizeNavigationSlug,
    sanitizeNavigationInput,
} from '@/lib/navigation/getNavigationMenu';

export const dynamic = 'force-dynamic';

function validateNavigationPayload(payload, { isCreate = false } = {}) {
    const normalized = sanitizeNavigationInput(payload);

    if (!normalized.name) {
        return { error: 'Name is required.' };
    }

    if (normalized.is_cta && normalized.parent_id) {
        return { error: 'CTA items must be top-level items.' };
    }

    if (!isCreate && payload.parent_id === payload.id) {
        return { error: 'An item cannot be its own parent.' };
    }

    return { data: normalized };
}

export const GET = withAdminAuth(async () => {
    try {
        const items = await listNavigationItems({ includeInactive: true });
        return NextResponse.json({
            success: true,
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
        const validation = validateNavigationPayload(body, { isCreate: true });

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