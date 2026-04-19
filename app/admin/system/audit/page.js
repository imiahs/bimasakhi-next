'use client';
import React, { useEffect, useState, useCallback } from 'react';

const ACTION_COLORS = {
    create: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    update: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    delete: 'text-red-400 bg-red-500/10 border-red-500/20',
    login: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    logout: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    'job trigger': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    'content changes': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    'SEO changes': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    'user management': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

function ActionBadge({ action }) {
    const colors = ACTION_COLORS[action] || 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    return (
        <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-mono ${colors}`}>
            {action}
        </span>
    );
}

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [actionFilter, setActionFilter] = useState('');
    const [expanded, setExpanded] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [exporting, setExporting] = useState(false);

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ page: '1', limit: '10000' });
            if (actionFilter) params.set('action', actionFilter);
            if (searchTerm) params.set('search', searchTerm);
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);
            const res = await fetch(`/api/admin/audit-log?${params}`, { credentials: 'include' });
            const json = await res.json();
            if (!json.success || !json.data?.length) { alert('No data to export'); return; }
            const headers = ['Date', 'Action', 'Resource', 'Admin', 'IP', 'Metadata'];
            const escape = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
            const rows = json.data.map(l => [
                new Date(l.created_at).toISOString(),
                l.action, l.target_resource,
                l.admin_email || l.admin_id || 'system',
                l.ip_address || '',
                JSON.stringify(l.metadata || {}),
            ].map(escape).join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
        } catch (err) {
            alert('Export failed: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '30' });
            if (actionFilter) params.set('action', actionFilter);
            if (searchTerm) params.set('search', searchTerm);
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);

            const res = await fetch(`/api/admin/audit-log?${params}`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setLogs(json.data || []);
                setPagination(json.pagination);
            } else {
                setError(json.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [page, actionFilter, searchTerm, dateFrom, dateTo]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const actions = ['login', 'logout', 'create', 'update', 'delete', 'job trigger', 'content changes', 'SEO changes'];

    return (
        <div className="mx-auto max-w-5xl space-y-4 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-white">Audit Log</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Every admin action recorded — append-only, immutable
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {pagination && (
                        <span className="text-xs text-slate-500">
                            {pagination.total} total entries
                        </span>
                    )}
                    <button
                        onClick={handleExportCSV}
                        disabled={exporting}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                        {exporting ? 'Exporting...' : '↓ Export CSV'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="space-y-3">
                {/* Search + Date Range */}
                <div className="flex gap-3 flex-wrap items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Search</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            placeholder="Search by resource, email..."
                            className="w-full px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/40"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/40"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/40"
                        />
                    </div>
                    {(searchTerm || dateFrom || dateTo) && (
                        <button onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setPage(1); }} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
                            Clear
                        </button>
                    )}
                </div>

                {/* Action filters */}
                <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => { setActionFilter(''); setPage(1); }}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                        !actionFilter ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                    }`}
                >
                    All
                </button>
                {actions.map(a => (
                    <button
                        key={a}
                        onClick={() => { setActionFilter(a); setPage(1); }}
                        className={`rounded-full px-3 py-1 text-xs transition ${
                            actionFilter === a ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                        }`}
                    >
                        {a}
                    </button>
                ))}
                </div>
            </div>

            {/* Log List */}
            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
                </div>
            ) : logs.length === 0 ? (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-8 text-center text-sm text-slate-500">
                    No audit logs found
                </div>
            ) : (
                <div className="space-y-1">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                            <button
                                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                            >
                                <span className="text-xs text-slate-600 font-mono w-36 flex-shrink-0">
                                    {new Date(log.created_at).toLocaleString()}
                                </span>
                                <ActionBadge action={log.action} />
                                <span className="text-sm text-slate-300 truncate flex-1">
                                    {log.target_resource}
                                </span>
                                <span className="text-xs text-slate-500 flex-shrink-0">
                                    {log.admin_email || log.admin_id || 'system'}
                                </span>
                                <span className="text-slate-600 text-xs">
                                    {expanded === log.id ? '▲' : '▼'}
                                </span>
                            </button>
                            {expanded === log.id && (
                                <div className="border-t border-white/[0.04] px-4 py-3">
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="text-slate-500">Admin ID:</span>
                                            <span className="ml-2 text-slate-300 font-mono">{log.admin_id || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">IP:</span>
                                            <span className="ml-2 text-slate-300 font-mono">{log.ip_address || '—'}</span>
                                        </div>
                                    </div>
                                    {log.metadata && (
                                        <pre className="mt-2 rounded bg-black/30 p-2 text-[11px] text-slate-400 overflow-x-auto max-h-40">
                                            {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/[0.04] disabled:opacity-30"
                    >
                        Prev
                    </button>
                    <span className="text-xs text-slate-500">
                        Page {page} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page >= pagination.totalPages}
                        className="rounded border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/[0.04] disabled:opacity-30"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
