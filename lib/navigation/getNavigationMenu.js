import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const NAVIGATION_MENU_KEYS = {
    PUBLIC_HEADER: 'public_header',
    PUBLIC_FOOTER: 'public_footer',
    ADMIN_SIDEBAR: 'admin_sidebar',
};

const LEGACY_NAVIGATION_SELECT = 'id, name, slug, parent_id, order_index, is_active, is_cta, created_at, updated_at';
const NAVIGATION_SELECT = 'id, name, slug, parent_id, order_index, is_active, is_cta, menu_key, icon_key, note, created_at, updated_at';
const SUPPORTED_MENU_KEYS = new Set(Object.values(NAVIGATION_MENU_KEYS));

function getNavigationClient() {
    const supabase = getServiceSupabase();

    if (!supabase) {
        throw new Error('Supabase service client is not configured.');
    }

    return supabase;
}

function isExtendedSchemaError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('menu_key') || message.includes('icon_key') || message.includes('note');
}

export function normalizeMenuKey(menuKey) {
    if (!menuKey) {
        return NAVIGATION_MENU_KEYS.PUBLIC_HEADER;
    }

    const normalized = String(menuKey).trim().toLowerCase();
    return SUPPORTED_MENU_KEYS.has(normalized)
        ? normalized
        : NAVIGATION_MENU_KEYS.PUBLIC_HEADER;
}

function normalizeStoredNavigationItem(item = {}) {
    return {
        ...item,
        slug: normalizeNavigationSlug(item.slug),
        menu_key: normalizeMenuKey(item.menu_key),
        icon_key: item.icon_key ? String(item.icon_key).trim() : null,
        note: item.note ? String(item.note).trim() : null,
    };
}

function sortNavigationItems(items) {
    return [...items].sort((left, right) => {
        if ((left.order_index || 0) !== (right.order_index || 0)) {
            return (left.order_index || 0) - (right.order_index || 0);
        }

        return String(left.name || '').localeCompare(String(right.name || ''));
    });
}

export function normalizeNavigationSlug(slug) {
    if (!slug) {
        return null;
    }

    const trimmed = String(slug).trim();

    if (!trimmed) {
        return null;
    }

    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function sanitizeNavigationInput(input = {}) {
    return {
        name: String(input.name || '').trim(),
        slug: normalizeNavigationSlug(input.slug),
        parent_id: input.parent_id || null,
        order_index: Number.isFinite(Number(input.order_index)) ? Number(input.order_index) : 0,
        is_active: input.is_active !== false,
        is_cta: Boolean(input.is_cta),
        menu_key: normalizeMenuKey(input.menu_key),
        icon_key: input.icon_key ? String(input.icon_key).trim() : null,
        note: input.note ? String(input.note).trim() : null,
    };
}

export function buildNavigationTree(items = []) {
    const sortedItems = sortNavigationItems(items);
    const nodes = new Map();

    for (const item of sortedItems) {
        nodes.set(item.id, {
            ...normalizeStoredNavigationItem(item),
            children: [],
        });
    }

    const roots = [];

    for (const item of sortedItems) {
        const node = nodes.get(item.id);

        if (item.parent_id && nodes.has(item.parent_id)) {
            nodes.get(item.parent_id).children.push(node);
            continue;
        }

        roots.push(node);
    }

    const sortTree = (entries) => sortNavigationItems(entries).map((entry) => ({
        ...entry,
        children: sortTree(entry.children || []),
    }));

    return sortTree(roots);
}

function getLegacyCompatiblePayload(payload) {
    return {
        name: payload.name,
        slug: payload.slug,
        parent_id: payload.parent_id,
        order_index: payload.order_index,
        is_active: payload.is_active,
        is_cta: payload.is_cta,
    };
}

async function selectNavigationItems({ includeInactive = false, menuKey = NAVIGATION_MENU_KEYS.PUBLIC_HEADER } = {}) {
    const supabase = getNavigationClient();
    const normalizedMenuKey = normalizeMenuKey(menuKey);

    const buildQuery = (select, withMenuKey = true) => {
        let query = supabase
            .from('navigation_menu')
            .select(select)
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: true });

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        if (withMenuKey) {
            query = query.eq('menu_key', normalizedMenuKey);
        }

        return query;
    };

    const { data, error } = await buildQuery(NAVIGATION_SELECT);

    if (error) {
        if (!isExtendedSchemaError(error)) {
            throw error;
        }

        if (normalizedMenuKey !== NAVIGATION_MENU_KEYS.PUBLIC_HEADER) {
            return [];
        }

        const legacyResult = await buildQuery(LEGACY_NAVIGATION_SELECT, false);
        if (legacyResult.error) {
            throw legacyResult.error;
        }

        return (legacyResult.data || []).map((item) => normalizeStoredNavigationItem(item));
    }

    return (data || []).map((item) => normalizeStoredNavigationItem(item));
}

export async function listNavigationItems({ includeInactive = false, menuKey = NAVIGATION_MENU_KEYS.PUBLIC_HEADER } = {}) {
    return selectNavigationItems({ includeInactive, menuKey });
}

export async function getNavigationMenu({ menuKey = NAVIGATION_MENU_KEYS.PUBLIC_HEADER } = {}) {
    const items = await listNavigationItems({ menuKey });
    return buildNavigationTree(items);
}

export async function createNavigationItem(input) {
    const supabase = getNavigationClient();
    const payload = sanitizeNavigationInput(input);
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase
        .from('navigation_menu')
        .insert({
            ...payload,
            updated_at: timestamp,
        })
        .select(NAVIGATION_SELECT)
        .single();

    if (error) {
        if (!isExtendedSchemaError(error) || payload.menu_key !== NAVIGATION_MENU_KEYS.PUBLIC_HEADER) {
            throw error;
        }

        const legacyResult = await supabase
            .from('navigation_menu')
            .insert({
                ...getLegacyCompatiblePayload(payload),
                updated_at: timestamp,
            })
            .select(LEGACY_NAVIGATION_SELECT)
            .single();

        if (legacyResult.error) {
            throw legacyResult.error;
        }

        return normalizeStoredNavigationItem(legacyResult.data);
    }

    return normalizeStoredNavigationItem(data);
}

export async function updateNavigationItem(id, input) {
    const supabase = getNavigationClient();
    const payload = sanitizeNavigationInput(input);
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase
        .from('navigation_menu')
        .update({
            ...payload,
            updated_at: timestamp,
        })
        .eq('id', id)
        .select(NAVIGATION_SELECT)
        .single();

    if (error) {
        if (!isExtendedSchemaError(error) || payload.menu_key !== NAVIGATION_MENU_KEYS.PUBLIC_HEADER) {
            throw error;
        }

        const legacyResult = await supabase
            .from('navigation_menu')
            .update({
                ...getLegacyCompatiblePayload(payload),
                updated_at: timestamp,
            })
            .eq('id', id)
            .select(LEGACY_NAVIGATION_SELECT)
            .single();

        if (legacyResult.error) {
            throw legacyResult.error;
        }

        return normalizeStoredNavigationItem(legacyResult.data);
    }

    return normalizeStoredNavigationItem(data);
}

export async function deleteNavigationItem(id) {
    const supabase = getNavigationClient();
    const { error } = await supabase
        .from('navigation_menu')
        .delete()
        .eq('id', id);

    if (error) {
        throw error;
    }

    return { success: true };
}
