import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

const NAVIGATION_SELECT = 'id, name, slug, parent_id, order_index, is_active, is_cta, created_at, updated_at';

function getNavigationClient() {
    const supabase = getServiceSupabase();

    if (!supabase) {
        throw new Error('Supabase service client is not configured.');
    }

    return supabase;
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
    };
}

export function buildNavigationTree(items = []) {
    const sortedItems = sortNavigationItems(items);
    const nodes = new Map();

    for (const item of sortedItems) {
        nodes.set(item.id, {
            ...item,
            slug: normalizeNavigationSlug(item.slug),
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

export async function listNavigationItems({ includeInactive = false } = {}) {
    const supabase = getNavigationClient();
    let query = supabase
        .from('navigation_menu')
        .select(NAVIGATION_SELECT)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

    if (!includeInactive) {
        query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return data || [];
}

export async function getNavigationMenu() {
    const items = await listNavigationItems();
    return buildNavigationTree(items);
}

export async function createNavigationItem(input) {
    const supabase = getNavigationClient();
    const payload = sanitizeNavigationInput(input);

    const { data, error } = await supabase
        .from('navigation_menu')
        .insert({
            ...payload,
            updated_at: new Date().toISOString(),
        })
        .select(NAVIGATION_SELECT)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function updateNavigationItem(id, input) {
    const supabase = getNavigationClient();
    const payload = sanitizeNavigationInput(input);

    const { data, error } = await supabase
        .from('navigation_menu')
        .update({
            ...payload,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(NAVIGATION_SELECT)
        .single();

    if (error) {
        throw error;
    }

    return data;
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
