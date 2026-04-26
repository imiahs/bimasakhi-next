'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const EMPTY_FORM = {
    name: '',
    slug: '',
    parent_id: '',
    order_index: 0,
    is_active: true,
    is_cta: false,
};

function sortItems(items) {
    return [...items].sort((left, right) => {
        if ((left.order_index || 0) !== (right.order_index || 0)) {
            return (left.order_index || 0) - (right.order_index || 0);
        }

        return String(left.name || '').localeCompare(String(right.name || ''));
    });
}

export default function NavigationAdminPage() {
    const [items, setItems] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [newItem, setNewItem] = useState(EMPTY_FORM);

    const syncDrafts = useCallback((nextItems) => {
        setDrafts(Object.fromEntries(nextItems.map((item) => [item.id, {
            name: item.name || '',
            slug: item.slug || '',
            parent_id: item.parent_id || '',
            order_index: item.order_index || 0,
            is_active: item.is_active !== false,
            is_cta: Boolean(item.is_cta),
        }])));
    }, []);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/navigation', { credentials: 'include', cache: 'no-store' });
            const payload = await response.json();

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to load navigation items.');
            }

            const nextItems = sortItems(payload.items || []);
            setItems(nextItems);
            syncDrafts(nextItems);
        } catch (requestError) {
            setError(requestError.message);
            setItems([]);
            syncDrafts([]);
        } finally {
            setLoading(false);
        }
    }, [syncDrafts]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const topLevelOptions = useMemo(() => items.filter((item) => !item.parent_id), [items]);

    const handleDraftChange = (id, field, value) => {
        setDrafts((current) => ({
            ...current,
            [id]: {
                ...current[id],
                [field]: value,
                ...(field === 'parent_id' && value ? { is_cta: false } : {}),
            },
        }));
    };

    const handleNewItemChange = (field, value) => {
        setNewItem((current) => ({
            ...current,
            [field]: value,
            ...(field === 'parent_id' && value ? { is_cta: false } : {}),
        }));
    };

    const handleSave = async (id) => {
        setSavingId(id);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch(`/api/admin/navigation/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(drafts[id]),
            });
            const payload = await response.json();

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to save navigation item.');
            }

            setMessage(`Saved ${payload.item.name}.`);
            await fetchItems();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch(`/api/admin/navigation/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const payload = await response.json();

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to delete navigation item.');
            }

            setMessage('Navigation item deleted.');
            await fetchItems();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        setCreating(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/navigation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newItem),
            });
            const payload = await response.json();

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to create navigation item.');
            }

            setNewItem(EMPTY_FORM);
            setMessage(`Created ${payload.item.name}.`);
            await fetchItems();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-white">Navigation</h1>
                <p className="text-sm text-slate-400">
                    Public header navigation now reads from the database through <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-emerald-300">/api/navigation</code>.
                    Changes made here go live on the next page reload.
                </p>
            </div>

            <form onSubmit={handleCreate} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Add Menu Item</h2>
                    <span className="text-xs text-slate-500">Top-level and one-level nested items are supported</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <label className="flex flex-col gap-2 text-sm text-slate-300">
                        <span>Name</span>
                        <input
                            value={newItem.name}
                            onChange={(event) => handleNewItemChange('name', event.target.value)}
                            className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                            placeholder="Resources"
                            required
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm text-slate-300">
                        <span>Slug</span>
                        <input
                            value={newItem.slug}
                            onChange={(event) => handleNewItemChange('slug', event.target.value)}
                            className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                            placeholder="/resources"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm text-slate-300">
                        <span>Parent</span>
                        <select
                            value={newItem.parent_id}
                            onChange={(event) => handleNewItemChange('parent_id', event.target.value)}
                            className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                        >
                            <option value="">Top-level item</option>
                            {topLevelOptions.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2 text-sm text-slate-300">
                        <span>Order</span>
                        <input
                            type="number"
                            value={newItem.order_index}
                            onChange={(event) => handleNewItemChange('order_index', Number(event.target.value))}
                            className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                        />
                    </label>

                    <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                        <input
                            type="checkbox"
                            checked={newItem.is_active}
                            onChange={(event) => handleNewItemChange('is_active', event.target.checked)}
                        />
                        <span>Active</span>
                    </label>

                    <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                        <input
                            type="checkbox"
                            checked={newItem.is_cta}
                            onChange={(event) => handleNewItemChange('is_cta', event.target.checked)}
                            disabled={Boolean(newItem.parent_id)}
                        />
                        <span>Render as CTA</span>
                    </label>
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={creating}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                        {creating ? 'Creating...' : 'Create Item'}
                    </button>
                    {message && <span className="text-sm text-emerald-300">{message}</span>}
                    {error && <span className="text-sm text-rose-300">{error}</span>}
                </div>
            </form>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Current Navbar Structure</h2>
                    <button
                        type="button"
                        onClick={fetchItems}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-emerald-500 hover:text-white"
                    >
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <p className="text-sm text-slate-400">Loading navigation items...</p>
                ) : items.length === 0 ? (
                    <p className="text-sm text-slate-400">No navigation items found.</p>
                ) : (
                    <div className="space-y-4">
                        {sortItems(items).map((item) => {
                            const draft = drafts[item.id] || EMPTY_FORM;
                            const parentName = item.parent_id
                                ? items.find((candidate) => candidate.id === item.parent_id)?.name || 'Unknown parent'
                                : 'Top-level';

                            return (
                                <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{item.name}</p>
                                            <p className="text-xs text-slate-500">Parent: {parentName}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide">
                                            <span className={`rounded-full px-2 py-1 ${item.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-600/30 text-slate-400'}`}>
                                                {item.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            {item.is_cta && (
                                                <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-300">CTA</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        <label className="flex flex-col gap-2 text-sm text-slate-300">
                                            <span>Name</span>
                                            <input
                                                value={draft.name}
                                                onChange={(event) => handleDraftChange(item.id, 'name', event.target.value)}
                                                className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                                            />
                                        </label>

                                        <label className="flex flex-col gap-2 text-sm text-slate-300">
                                            <span>Slug</span>
                                            <input
                                                value={draft.slug}
                                                onChange={(event) => handleDraftChange(item.id, 'slug', event.target.value)}
                                                className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                                            />
                                        </label>

                                        <label className="flex flex-col gap-2 text-sm text-slate-300">
                                            <span>Parent</span>
                                            <select
                                                value={draft.parent_id}
                                                onChange={(event) => handleDraftChange(item.id, 'parent_id', event.target.value)}
                                                className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                                            >
                                                <option value="">Top-level item</option>
                                                {topLevelOptions
                                                    .filter((candidate) => candidate.id !== item.id)
                                                    .map((candidate) => (
                                                        <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                                                    ))}
                                            </select>
                                        </label>

                                        <label className="flex flex-col gap-2 text-sm text-slate-300">
                                            <span>Order</span>
                                            <input
                                                type="number"
                                                value={draft.order_index}
                                                onChange={(event) => handleDraftChange(item.id, 'order_index', Number(event.target.value))}
                                                className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                                            />
                                        </label>

                                        <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={draft.is_active}
                                                onChange={(event) => handleDraftChange(item.id, 'is_active', event.target.checked)}
                                            />
                                            <span>Active</span>
                                        </label>

                                        <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={draft.is_cta}
                                                disabled={Boolean(draft.parent_id)}
                                                onChange={(event) => handleDraftChange(item.id, 'is_cta', event.target.checked)}
                                            />
                                            <span>CTA button</span>
                                        </label>
                                    </div>

                                    <div className="mt-4 flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleSave(item.id)}
                                            disabled={savingId === item.id}
                                            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                                        >
                                            {savingId === item.id ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(item.id)}
                                            disabled={deletingId === item.id}
                                            className="rounded-lg border border-rose-500/30 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:border-rose-400 hover:text-white disabled:opacity-60"
                                        >
                                            {deletingId === item.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}