import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import {
    deleteNavigationItem,
    normalizeNavigationSlug,
    sanitizeNavigationInput,
    updateNavigationItem,
} from '@/lib/navigation/getNavigationMenu';

export const dynamic = 'force-dynamic';

function validateNavigationPayload(payload, id) {
    const normalized = sanitizeNavigationInput(payload);

    if (!normalized.name) {
        return { error: 'Name is required.' };
    }

    if (normalized.parent_id === id) {
        return { error: 'An item cannot be its own parent.' };
    }

    if (normalized.is_cta && normalized.parent_id) {
        return { error: 'CTA items must be top-level items.' };
    }

    return { data: normalized };
}

export const PATCH = withAdminAuth(async (request, user, context) => {
    try {
        const { id } = await context.params;
        const body = await request.json();
        const validation = validateNavigationPayload(body, id);

        if (validation.error) {
            return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }

        const item = await updateNavigationItem(id, {
            ...validation.data,
            slug: normalizeNavigationSlug(validation.data.slug),
        });

        return NextResponse.json({ success: true, item });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}, ['super_admin']);

export const DELETE = withAdminAuth(async (request, user, context) => {
    try {
        const { id } = await context.params;
        await deleteNavigationItem(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}, ['super_admin']);