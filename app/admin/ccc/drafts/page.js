'use client';

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import StatusBadge from '@/components/admin/ui/StatusBadge';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

export default function CCCDraftsList() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 12 });
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    const [rowActionId, setRowActionId] = useState(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [deferredSearch, statusFilter]);

    useEffect(() => {
        let cancelled = false;

        async function loadDrafts() {
            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({
                    page: String(currentPage),
                    limit: '12',
                    status: statusFilter,
                });

                if (deferredSearch.trim()) {
                    params.set('search', deferredSearch.trim());
                }

                const response = await fetch(`/api/admin/ccc/drafts?${params.toString()}`, {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to load drafts');
                }

                if (cancelled) {
                    return;
                }

                if ((data.totalPages || 1) < currentPage && (data.totalPages || 1) > 0) {
                    setCurrentPage(data.totalPages || 1);
                    return;
                }

                setDrafts(data.drafts || []);
                setPagination({
                    total: data.total || 0,
                    totalPages: data.totalPages || 1,
                    limit: data.limit || 12,
                });
                setSelectedIds((current) => current.filter((id) => (data.drafts || []).some((draft) => draft.id === id)));
            } catch (loadError) {
                if (!cancelled) {
                    setDrafts([]);
                    setPagination({ total: 0, totalPages: 1, limit: 12 });
                    setError(loadError.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadDrafts();

        return () => {
            cancelled = true;
        };
    }, [currentPage, deferredSearch, statusFilter]);

    const allVisibleSelected = useMemo(
        () => drafts.length > 0 && drafts.every((draft) => selectedIds.includes(draft.id)),
        [drafts, selectedIds]
    );

    const selectedCount = selectedIds.length;
    const startRow = pagination.total === 0 ? 0 : ((currentPage - 1) * pagination.limit) + 1;
    const endRow = Math.min(currentPage * pagination.limit, pagination.total);

    const refreshCurrentPage = async (pageOverride = currentPage) => {
        const params = new URLSearchParams({
            page: String(pageOverride),
            limit: String(pagination.limit || 12),
            status: statusFilter,
        });

        if (deferredSearch.trim()) {
            params.set('search', deferredSearch.trim());
        }

        const response = await fetch(`/api/admin/ccc/drafts?${params.toString()}`, {
            credentials: 'include',
            cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to refresh drafts');
        }

        setDrafts(data.drafts || []);
        setPagination({
            total: data.total || 0,
            totalPages: data.totalPages || 1,
            limit: data.limit || 12,
        });
        setSelectedIds((current) => current.filter((id) => (data.drafts || []).some((draft) => draft.id === id)));
    };

    const toggleSelection = (draftId) => {
        setSelectedIds((current) => (
            current.includes(draftId)
                ? current.filter((id) => id !== draftId)
                : [...current, draftId]
        ));
    };

    const toggleSelectAllVisible = () => {
        setSelectedIds((current) => {
            if (allVisibleSelected) {
                return current.filter((id) => !drafts.some((draft) => draft.id === id));
            }

            return Array.from(new Set([...current, ...drafts.map((draft) => draft.id)]));
        });
    };

    const handleRowAction = async (draftId, action) => {
        setRowActionId(draftId);
        setError(null);

        try {
            const response = await fetch(`/api/admin/ccc/drafts/${draftId}`, {
                method: action === 'delete' ? 'DELETE' : 'PATCH',
                headers: action === 'delete' ? undefined : { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: action === 'delete' ? undefined : JSON.stringify({ action }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || `Failed to ${action} draft`);
            }

            await refreshCurrentPage();
        } catch (actionError) {
            setError(actionError.message);
        } finally {
            setRowActionId(null);
        }
    };

    const handleBulkArchive = async () => {
        setBulkSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/ccc/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'bulk_update_status', ids: selectedIds, status: 'archived' }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to archive drafts');
            }

            setSelectedIds([]);
            await refreshCurrentPage();
        } catch (bulkError) {
            setError(bulkError.message);
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleBulkRestore = async () => {
        setBulkSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/ccc/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'bulk_update_status', ids: selectedIds, status: 'draft' }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to restore drafts');
            }

            setSelectedIds([]);
            await refreshCurrentPage();
        } catch (bulkError) {
            setError(bulkError.message);
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleBulkDelete = async () => {
        setBulkSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/ccc/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'bulk_delete_archived', ids: selectedIds }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete archived drafts');
            }

            setSelectedIds([]);
            await refreshCurrentPage();
        } catch (bulkError) {
            setError(bulkError.message);
        } finally {
            setBulkSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="admin-kicker">Content Lifecycle</p>
                    <h1 className="admin-heading-lg mt-2">Content Drafts</h1>
                    <p className="admin-copy mt-2 max-w-2xl text-sm">
                        Review every draft state from one queue, including archived records, restore actions, and final destructive cleanup for archived items.
                    </p>
                </div>

                <Link href="/admin/ccc" className="admin-button-secondary self-start">
                    Back to CCC
                </Link>
            </div>

            {error && (
                <div className="admin-toast-error rounded-xl px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            <div className="admin-panel rounded-2xl p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="flex-1">
                        <label className="sr-only" htmlFor="draft-search">Search drafts</label>
                        <input
                            id="draft-search"
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by slug, headline, or SEO title"
                            className="admin-input px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="xl:w-[220px]">
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="admin-select px-3 py-2 text-sm">
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {pagination.total} total draft{pagination.total === 1 ? '' : 's'}
                    </p>

                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={selectedCount === 0 || bulkSubmitting} onClick={handleBulkArchive} className="admin-button-secondary text-xs">
                            Archive Selected
                        </button>
                        <button type="button" disabled={selectedCount === 0 || bulkSubmitting} onClick={handleBulkRestore} className="admin-button-secondary text-xs">
                            Restore Selected
                        </button>
                        <button type="button" disabled={selectedCount === 0 || bulkSubmitting} onClick={handleBulkDelete} className="admin-button-danger text-xs">
                            Delete Archived
                        </button>
                    </div>
                </div>
            </div>

            <div className="admin-panel overflow-hidden rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-left text-sm">
                        <thead className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                                <th className="px-5 py-4">
                                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} aria-label="Select visible drafts" />
                                </th>
                                <th className="px-5 py-4 font-semibold">Draft</th>
                                <th className="px-5 py-4 font-semibold">Slug</th>
                                <th className="px-5 py-4 font-semibold">Words</th>
                                <th className="px-5 py-4 font-semibold">Quality</th>
                                <th className="px-5 py-4 font-semibold">Status</th>
                                <th className="px-5 py-4 font-semibold">Created</th>
                                <th className="px-5 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, index) => (
                                    <tr key={`draft-skeleton-${index}`}>
                                        <td className="px-5 py-4"><div className="h-4 w-4 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-40 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-44 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-14 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-16 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-20 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="h-4 w-20 animate-pulse rounded bg-white/[0.08]" /></td>
                                        <td className="px-5 py-4"><div className="ml-auto h-4 w-48 animate-pulse rounded bg-white/[0.08]" /></td>
                                    </tr>
                                ))
                            ) : drafts.length > 0 ? (
                                drafts.map((draft) => {
                                    const isArchived = draft.status === 'archived';
                                    const isPublishable = draft.status === 'draft' || draft.status === 'review';
                                    const isPublished = draft.status === 'published' || draft.status === 'approved';

                                    return (
                                        <tr key={draft.id} className="text-slate-300 transition-colors hover:bg-white/[0.03]">
                                            <td className="px-5 py-4 align-top">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(draft.id)}
                                                    onChange={() => toggleSelection(draft.id)}
                                                    aria-label={`Select ${draft.slug}`}
                                                />
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <div>
                                                    <p className="font-semibold text-white">{draft.hero_headline || draft.page_title || 'Untitled draft'}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{draft.meta_title || 'No SEO title configured yet.'}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <div className="space-y-2">
                                                    <span className="font-mono text-xs text-emerald-300">/{draft.slug}</span>
                                                    {isPublished && (
                                                        <Link href={`/${draft.slug}`} target="_blank" className="block text-xs text-slate-500 hover:text-slate-200">
                                                            Open live page
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 align-top text-xs text-slate-300">{draft.word_count || 0}</td>
                                            <td className="px-5 py-4 align-top text-xs text-slate-300">
                                                {draft.quality_score == null ? '--' : `${draft.quality_score}/10`}
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <StatusBadge status={draft.status} />
                                            </td>
                                            <td className="px-5 py-4 align-top text-xs text-slate-400">
                                                {draft.created_at ? new Date(draft.created_at).toLocaleDateString('en-IN') : '--'}
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <button type="button" onClick={() => router.push(`/admin/ccc/drafts/${draft.id}`)} className="admin-button-secondary text-xs">
                                                        Edit
                                                    </button>
                                                    {isPublishable && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRowAction(draft.id, 'approve')}
                                                            disabled={rowActionId === draft.id}
                                                            className="admin-button-secondary text-xs"
                                                        >
                                                            {rowActionId === draft.id ? 'Working...' : 'Publish'}
                                                        </button>
                                                    )}
                                                    {isArchived ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRowAction(draft.id, 'restore')}
                                                                disabled={rowActionId === draft.id}
                                                                className="admin-button-secondary text-xs"
                                                            >
                                                                {rowActionId === draft.id ? 'Working...' : 'Restore'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRowAction(draft.id, 'delete')}
                                                                disabled={rowActionId === draft.id}
                                                                className="admin-button-danger text-xs"
                                                            >
                                                                {rowActionId === draft.id ? 'Deleting...' : 'Delete'}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRowAction(draft.id, 'archive')}
                                                            disabled={rowActionId === draft.id}
                                                            className="admin-button-secondary text-xs"
                                                        >
                                                            {rowActionId === draft.id ? 'Working...' : 'Archive'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-5 py-16 text-center">
                                        <div className="mx-auto max-w-md">
                                            <p className="text-base font-semibold text-white">No drafts found</p>
                                            <p className="mt-2 text-sm text-slate-500">
                                                Adjust the status filter or create a new draft from the Content Command Center.
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
        </div>
    );
}
