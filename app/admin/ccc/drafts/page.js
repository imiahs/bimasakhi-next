'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataTable from '@/components/admin/ui/DataTable';
import FilterBar from '@/components/admin/ui/FilterBar';
import StatusBadge from '@/components/admin/ui/StatusBadge';

export default function CCCDraftsList() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialStatus = searchParams.get('status') || 'all';
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(initialStatus);

    const fetchDrafts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
            if (search) params.set('search', search);
            params.set('limit', '50');

            const res = await fetch(`/api/admin/ccc/drafts?${params}`);
            const data = await res.json();

            if (!data.success) throw new Error(data.error || 'Failed to load drafts');

            setDrafts(data.drafts || []);
            setTotal(data.total || 0);
        } catch (err) {
            setError(err.message);
            setDrafts([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, search]);

    useEffect(() => {
        fetchDrafts();
    }, [fetchDrafts]);

    const columns = useMemo(() => [
        {
            key: 'slug',
            label: 'Slug',
            render: (row) => (
                <span className="text-emerald-400 font-mono text-xs truncate max-w-[200px] block" title={row.slug}>
                    /{row.slug}
                </span>
            )
        },
        {
            key: 'hero_headline',
            label: 'Headline',
            render: (row) => (
                <span className="truncate max-w-[250px] block text-slate-200" title={row.hero_headline}>
                    {row.hero_headline || row.page_title || '--'}
                </span>
            )
        },
        {
            key: 'word_count',
            label: 'Words',
            render: (row) => (
                <span className={`font-mono text-xs ${(row.word_count || 0) < 800 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {row.word_count || 0}
                </span>
            )
        },
        {
            key: 'quality_score',
            label: 'Quality',
            render: (row) => (
                <span className={`font-mono text-xs ${row.quality_score == null ? 'text-slate-500' : row.quality_score >= 8 ? 'text-emerald-400' : row.quality_score >= 5 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {row.quality_score != null ? `${row.quality_score}/10` : '--'}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <StatusBadge status={row.status} />
        },
        {
            key: 'created_at',
            label: 'Created',
            render: (row) => (
                <span className="text-xs text-slate-400">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '--'}
                </span>
            )
        }
    ], []);

    const filters = useMemo(() => [
        {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
                { value: 'all', label: 'All Statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'review', label: 'In Review' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'published', label: 'Published' }
            ]
        }
    ], [statusFilter]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Content Drafts</h1>
                    <p className="text-sm text-slate-400 mt-1">{total} total draft{total !== 1 ? 's' : ''}</p>
                </div>
            </div>

            <FilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by slug, headline..."
                filters={filters}
            />

            <DataTable
                columns={columns}
                data={drafts}
                loading={loading}
                error={error}
                emptyMessage="No drafts found. Generate pages via the Queue to create drafts."
                pageSize={20}
                onRowClick={(row) => router.push(`/admin/ccc/drafts/${row.id}`)}
            />
        </div>
    );
}
