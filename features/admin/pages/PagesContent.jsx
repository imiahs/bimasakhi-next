'use client';

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

const TYPE_OPTIONS = [
    { value: 'all', label: 'All Types' },
    { value: 'standard', label: 'Standard' },
    { value: 'campaign', label: 'Campaign' },
];

function emptyCreateForm() {
    return {
        title: '',
        slug: '',
        is_campaign_page: false,
    };
}

function emptyEditForm() {
    return {
        id: null,
        title: '',
        slug: '',
        meta_title: '',
        meta_description: '',
        status: 'draft',
        is_campaign_page: false,
    };
}

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-/]+|[-/]+$/g, '');
}

function statusBadgeClass(status) {
    if (status === 'published') {
        return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
    }

    if (status === 'archived') {
        return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
    }

    return 'border-white/[0.08] bg-white/[0.04] text-slate-300';
}

export default function PagesContent() {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [createForm, setCreateForm] = useState(emptyCreateForm);
    const [createSlugDirty, setCreateSlugDirty] = useState(false);
    const [editForm, setEditForm] = useState(emptyEditForm);
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 12 });
    const [selectedIds, setSelectedIds] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    const [rowActionId, setRowActionId] = useState(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [deferredSearch, statusFilter, typeFilter]);

    useEffect(() => {
        let cancelled = false;

        async function loadPages() {
            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({
                    page: String(currentPage),
                    limit: '12',
                    status: statusFilter,
                    type: typeFilter,
                });

                if (deferredSearch.trim()) {
                    params.set('search', deferredSearch.trim());
                }

                const response = await fetch(`/api/admin/pages?${params.toString()}`, {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to load pages');
                }

                if (cancelled) {
                    return;
                }

                if ((data.totalPages || 1) < currentPage && (data.totalPages || 1) > 0) {
                    setCurrentPage(data.totalPages || 1);
                    return;
                }

                setPages(data.pages || []);
                setPagination({
                    total: data.total || 0,
                    totalPages: data.totalPages || 1,
                    limit: data.limit || 12,
                });
                setSelectedIds((current) => current.filter((id) => (data.pages || []).some((page) => page.id === id)));
            } catch (loadError) {
                if (!cancelled) {
                    setPages([]);
                    setPagination({ total: 0, totalPages: 1, limit: 12 });
                    setError(loadError.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadPages();

        return () => {
            cancelled = true;
        };
    }, [currentPage, deferredSearch, statusFilter, typeFilter]);

    const allVisibleSelected = useMemo(
        () => pages.length > 0 && pages.every((page) => selectedIds.includes(page.id)),
        [pages, selectedIds]
    );

    const selectedCount = selectedIds.length;
    const startRow = pagination.total === 0 ? 0 : ((currentPage - 1) * pagination.limit) + 1;
    const endRow = Math.min(currentPage * pagination.limit, pagination.total);

    const refreshCurrentPage = async (pageOverride = currentPage) => {
        const params = new URLSearchParams({
            page: String(pageOverride),
            limit: String(pagination.limit || 12),
            status: statusFilter,
            type: typeFilter,
        });

        if (deferredSearch.trim()) {
            params.set('search', deferredSearch.trim());
        }

        const response = await fetch(`/api/admin/pages?${params.toString()}`, {
            credentials: 'include',
            cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to refresh pages');
        }

        setPages(data.pages || []);
        setPagination({
            total: data.total || 0,
            totalPages: data.totalPages || 1,
            limit: data.limit || 12,
        });
        setSelectedIds((current) => current.filter((id) => (data.pages || []).some((page) => page.id === id)));
    };

    const closeCreateModal = () => {
        setIsCreating(false);
        setCreateForm(emptyCreateForm());
        setCreateSlugDirty(false);
        setSubmitting(false);
    };

    const closeEditModal = () => {
        setIsEditing(false);
        setEditForm(emptyEditForm());
        setSubmitting(false);
    };

    const openEditModal = (page) => {
        setEditForm({
            id: page.id,
            title: page.title || '',
            slug: page.slug || '',
            meta_title: page.meta_title || '',
            meta_description: page.meta_description || '',
            status: page.status || 'draft',
            is_campaign_page: !!page.is_campaign_page,
        });
        setIsEditing(true);
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(createForm),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to create page');
            }

            closeCreateModal();
            setCurrentPage(1);
            await refreshCurrentPage(1);
        } catch (createError) {
            setError(createError.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveEdit = async (event) => {
        event.preventDefault();
        if (!editForm.id) {
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/pages/${editForm.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: editForm.title,
                    slug: editForm.slug,
                    meta_title: editForm.meta_title,
                    meta_description: editForm.meta_description,
                    status: editForm.status,
                    is_campaign_page: editForm.is_campaign_page,
                }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to update page');
            }

            closeEditModal();
            await refreshCurrentPage();
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleSelection = (pageId) => {
        setSelectedIds((current) => (
            current.includes(pageId)
                ? current.filter((id) => id !== pageId)
                : [...current, pageId]
        ));
    };

    const toggleSelectAllVisible = () => {
        setSelectedIds((current) => {
            if (allVisibleSelected) {
                return current.filter((id) => !pages.some((page) => page.id === id));
            }

            return Array.from(new Set([...current, ...pages.map((page) => page.id)]));
        });
    };

    const handleBulkStatus = async (status) => {
        if (selectedIds.length === 0) {
            return;
        }

        setBulkSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'bulk_update_status',
                    ids: selectedIds,
                    status,
                }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Bulk update failed');
            }

            setSelectedIds([]);
            await refreshCurrentPage();
        } catch (bulkError) {
            setError(bulkError.message);
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleArchive = async (pageId) => {
        setRowActionId(pageId);
        setError(null);

        try {
            const response = await fetch(`/api/admin/pages/${pageId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to archive page');
            }

            await refreshCurrentPage();
        } catch (archiveError) {
            setError(archiveError.message);
        } finally {
            setRowActionId(null);
        }
    };

    const handleRestore = async (pageId) => {
        setRowActionId(pageId);
        setError(null);

        try {
            const response = await fetch(`/api/admin/pages/${pageId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: 'draft' }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to restore page');
            }

            await refreshCurrentPage();
        } catch (restoreError) {
            setError(restoreError.message);
        } finally {
            setRowActionId(null);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="admin-kicker">Content Control</p>
                    <h1 className="admin-heading-lg mt-2">Visual Pages & Campaigns</h1>
                    <p className="admin-copy mt-2 max-w-2xl text-sm">
                        Manage every custom page from one surface: search, filters, pagination, slug-safe metadata edits, and soft delete without leaving the admin shell.
                    </p>
                </div>

                <button type="button" onClick={() => setIsCreating(true)} className="admin-button-primary self-start">
                    Create New Page
                </button>
            </div>

            {error && (
                <div className="admin-toast-error rounded-xl px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            <div className="admin-panel rounded-2xl p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="flex-1">
                        <label className="sr-only" htmlFor="page-search">Search pages</label>
                        <input
                            id="page-search"
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by title, slug, or meta title"
                            className="admin-input px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="admin-select px-3 py-2 text-sm">
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>

                        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="admin-select px-3 py-2 text-sm">
                            {TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {pagination.total} total page{pagination.total === 1 ? '' : 's'}
                    </p>

                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={selectedCount === 0 || bulkSubmitting} onClick={() => handleBulkStatus('draft')} className="admin-button-secondary text-xs">
                            Move Selected to Draft
                        </button>
                        <button type="button" disabled={selectedCount === 0 || bulkSubmitting} onClick={() => handleBulkStatus('published')} className="admin-button-secondary text-xs">
                            Publish Selected
                        </button>
                        <button type="button" disabled={selectedCount === 0 || bulkSubmitting} onClick={() => handleBulkStatus('archived')} className="admin-button-danger text-xs">
                            Archive Selected
                        </button>
                    </div>
                </div>
            </div>

            <div className="admin-panel overflow-hidden rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px] text-left text-sm">
                        <thead className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                                <th className="px-5 py-4">
                                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} aria-label="Select visible pages" />
                                </th>
                                <th className="px-5 py-4 font-semibold">Page</th>
                                <th className="px-5 py-4 font-semibold">Slug</th>
                                <th className="px-5 py-4 font-semibold">Status</th>
                                <th className="px-5 py-4 font-semibold">Type</th>
                                <th className="px-5 py-4 font-semibold">Updated</th>
                                <th className="px-5 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, index) => (
                                    <tr key={`page-skeleton-${index}`}>
                                        <td className="px-5 py-4"><div className="h-4 w-4 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-40 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-48 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-20 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-20 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-24 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="ml-auto h-4 w-48 animate-pulse rounded bg-white/[0.08]" /></td>
                                    </tr>
                                ))
                            ) : pages.length > 0 ? (
                                pages.map((page) => (
                                    <tr key={page.id} className="text-slate-300 transition-colors hover:bg-white/[0.03]">
                                        <td className="px-5 py-4 align-top">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(page.id)}
                                                onChange={() => toggleSelection(page.id)}
                                                aria-label={`Select ${page.title}`}
                                            />
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            <div>
                                                <p className="font-semibold text-white">{page.title}</p>
                                                <p className="mt-1 text-xs text-slate-500">{page.meta_title || 'No meta title configured yet.'}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            <div className="space-y-2">
                                                <span className="font-mono text-xs text-emerald-300">/pages/{page.slug}</span>
                                                <Link href={`/pages/${page.slug}`} target="_blank" className="block text-xs text-slate-500 hover:text-slate-200">
                                                    Open public preview
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(page.status)}`}>
                                                {page.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${page.is_campaign_page ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-sky-500/25 bg-sky-500/10 text-sky-300'}`}>
                                                {page.is_campaign_page ? 'Campaign' : 'Standard'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 align-top text-xs text-slate-400">
                                            {page.updated_at ? new Date(page.updated_at).toLocaleString('en-IN') : '--'}
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <button type="button" onClick={() => openEditModal(page)} className="admin-button-secondary text-xs">
                                                    Edit Details
                                                </button>
                                                <Link href={`/admin/pages/${page.id}`} className="admin-button-secondary text-xs">
                                                    Edit Blocks
                                                </Link>
                                                {page.status === 'archived' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRestore(page.id)}
                                                        disabled={rowActionId === page.id}
                                                        className="admin-button-secondary text-xs"
                                                    >
                                                        {rowActionId === page.id ? 'Restoring...' : 'Restore'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleArchive(page.id)}
                                                        disabled={rowActionId === page.id}
                                                        className="admin-button-danger text-xs"
                                                    >
                                                        {rowActionId === page.id ? 'Archiving...' : 'Soft Delete'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center">
                                        <div className="mx-auto max-w-md">
                                            <p className="text-base font-semibold text-white">No matching pages found</p>
                                            <p className="mt-2 text-sm text-slate-500">
                                                Adjust the filters or create a new page to start managing the content inventory.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && pagination.total > 0 && (
                    <div className="flex flex-col gap-3 border-t border-white/[0.06] bg-white/[0.02] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Showing {startRow}-{endRow} of {pagination.total}
                        </p>

                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="admin-button-secondary text-xs">
                                First
                            </button>
                            <button type="button" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="admin-button-secondary text-xs">
                                Prev
                            </button>
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-200">
                                {currentPage} / {pagination.totalPages}
                            </span>
                            <button type="button" onClick={() => setCurrentPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={currentPage >= pagination.totalPages} className="admin-button-secondary text-xs">
                                Next
                            </button>
                            <button type="button" onClick={() => setCurrentPage(pagination.totalPages)} disabled={currentPage >= pagination.totalPages} className="admin-button-secondary text-xs">
                                Last
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="admin-panel w-full max-w-2xl rounded-2xl p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="admin-kicker">Create Page</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Draft New Custom Page</h2>
                            </div>
                            <button type="button" onClick={closeCreateModal} className="text-sm text-slate-500 hover:text-white">Close</button>
                        </div>

                        <form onSubmit={handleCreate} className="mt-6 space-y-4">
                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Page Title</span>
                                <input
                                    type="text"
                                    value={createForm.title}
                                    onChange={(event) => {
                                        const nextTitle = event.target.value;
                                        setCreateForm((current) => ({
                                            ...current,
                                            title: nextTitle,
                                            slug: createSlugDirty ? current.slug : normalizeSlug(nextTitle),
                                        }));
                                    }}
                                    placeholder="Bima Sakhi Recruitment Gurugram"
                                    className="admin-input mt-2 px-3 py-2 text-sm"
                                    required
                                />
                            </label>

                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Slug</span>
                                <input
                                    type="text"
                                    value={createForm.slug}
                                    onChange={(event) => {
                                        setCreateSlugDirty(true);
                                        setCreateForm((current) => ({ ...current, slug: normalizeSlug(event.target.value) }));
                                    }}
                                    placeholder="bima-sakhi-recruitment-gurugram"
                                    className="admin-input mt-2 px-3 py-2 text-sm font-mono"
                                    required
                                />
                            </label>

                            <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={createForm.is_campaign_page}
                                    onChange={(event) => setCreateForm((current) => ({ ...current, is_campaign_page: event.target.checked }))}
                                />
                                Flag as campaign landing page
                            </label>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeCreateModal} className="admin-button-secondary">Cancel</button>
                                <button type="submit" disabled={submitting} className="admin-button-primary">
                                    {submitting ? 'Creating...' : 'Create Page'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="admin-panel w-full max-w-3xl rounded-2xl p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="admin-kicker">Edit Page</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Update Page Metadata</h2>
                            </div>
                            <button type="button" onClick={closeEditModal} className="text-sm text-slate-500 hover:text-white">Close</button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="mt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="block">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Page Title</span>
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                                        className="admin-input mt-2 px-3 py-2 text-sm"
                                        required
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Slug</span>
                                    <input
                                        type="text"
                                        value={editForm.slug}
                                        onChange={(event) => setEditForm((current) => ({ ...current, slug: normalizeSlug(event.target.value) }))}
                                        className="admin-input mt-2 px-3 py-2 text-sm font-mono"
                                        required
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</span>
                                    <select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} className="admin-select mt-2 px-3 py-2 text-sm">
                                        {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-slate-300 md:mt-7">
                                    <input
                                        type="checkbox"
                                        checked={editForm.is_campaign_page}
                                        onChange={(event) => setEditForm((current) => ({ ...current, is_campaign_page: event.target.checked }))}
                                    />
                                    Campaign landing page
                                </label>
                            </div>

                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Meta Title</span>
                                <input
                                    type="text"
                                    value={editForm.meta_title}
                                    onChange={(event) => setEditForm((current) => ({ ...current, meta_title: event.target.value }))}
                                    className="admin-input mt-2 px-3 py-2 text-sm"
                                />
                            </label>

                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Meta Description</span>
                                <textarea
                                    value={editForm.meta_description}
                                    onChange={(event) => setEditForm((current) => ({ ...current, meta_description: event.target.value }))}
                                    rows={4}
                                    className="admin-input mt-2 px-3 py-2 text-sm"
                                />
                            </label>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeEditModal} className="admin-button-secondary">Cancel</button>
                                <button type="submit" disabled={submitting} className="admin-button-primary">
                                    {submitting ? 'Saving...' : 'Save Details'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
