import { revalidateTag } from 'next/cache';
import { logObs } from '@/lib/observability';

export const REUSABLE_PAGE_RUNTIME_CACHE_KEY = 'custom-page-runtime';

export function normalizeReusablePageSlug(value) {
    return String(value || '').trim().toLowerCase();
}

export function getReusablePageRuntimeTag(slug) {
    const normalizedSlug = normalizeReusablePageSlug(slug);
    return normalizedSlug ? `${REUSABLE_PAGE_RUNTIME_CACHE_KEY}:${normalizedSlug}` : null;
}

function buildInvalidationTargetSlugs({ currentSlug, previousSlug, currentStatus, previousStatus }) {
    const targetSlugs = [];

    if (previousStatus === 'published') {
        targetSlugs.push(normalizeReusablePageSlug(previousSlug));
    }

    if (currentStatus === 'published') {
        targetSlugs.push(normalizeReusablePageSlug(currentSlug));
    }

    return [...new Set(targetSlugs.filter(Boolean))];
}

export async function invalidateReusablePageRuntime({
    action,
    currentSlug,
    previousSlug,
    currentStatus,
    previousStatus,
    pageId,
}) {
    const targetSlugs = buildInvalidationTargetSlugs({
        currentSlug,
        previousSlug,
        currentStatus,
        previousStatus,
    });

    if (targetSlugs.length === 0) {
        return {
            attempted: false,
            invalidated: false,
            mode: 'route_owned_save_time_tagged',
            targetSlugs: [],
            replayWindowGovernance: 'bounded_window_retained',
        };
    }

    const tags = targetSlugs.map(getReusablePageRuntimeTag).filter(Boolean);

    try {
        for (const tag of tags) {
            await revalidateTag(tag);
        }

        await logObs('INFO', 'Reusable page cache invalidated', 'system:runtime-economics', {
            route: '/pages/[slug]',
            action,
            pageId,
            targetSlugs,
            tags,
            previousStatus: previousStatus || null,
            currentStatus: currentStatus || null,
            invalidationMode: 'route_owned_save_time_tagged',
        });

        return {
            attempted: true,
            invalidated: true,
            mode: 'route_owned_save_time_tagged',
            targetSlugs,
            tags,
            replayWindowGovernance: 'bounded_window_with_save_time_invalidation',
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown_invalidation_error';

        await logObs('WARN', 'Reusable page cache invalidation failed', 'system:runtime-economics', {
            route: '/pages/[slug]',
            action,
            pageId,
            targetSlugs,
            tags,
            previousStatus: previousStatus || null,
            currentStatus: currentStatus || null,
            invalidationMode: 'route_owned_save_time_tagged',
            error: message,
        });

        return {
            attempted: true,
            invalidated: false,
            mode: 'route_owned_save_time_tagged',
            targetSlugs,
            tags,
            error: message,
            replayWindowGovernance: 'bounded_window_fallback',
        };
    }
}