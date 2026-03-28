'use client';
import React, { memo, useState, useMemo, useCallback } from 'react';

/**
 * DataTable — Production-grade paginated table
 * 
 * Features:
 *  - Column-based rendering with custom render functions
 *  - Built-in pagination (configurable page size, default 20, max 50)
 *  - Loading / empty / error states
 *  - Keyboard-navigable pagination controls
 *  - Minimal DOM: only renders visible page rows
 * 
 * @param {Array}    columns      — [{ key, label, render?(row) }]
 * @param {Array}    data         — Row data array
 * @param {boolean}  loading      — Show loading skeleton
 * @param {string}   error        — Error message to display
 * @param {string}   emptyMessage — Text when data is empty
 * @param {number}   pageSize     — Rows per page (default 20, capped at 50)
 * @param {Function} onRowClick   — Optional row click handler
 */
function DataTable({ 
    columns = [], 
    data = [], 
    loading = false, 
    error = null,
    emptyMessage = 'No data available.', 
    pageSize: rawPageSize = 20,
    onRowClick
}) {
    const pageSize = Math.min(rawPageSize, 50);
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.length || 0) / pageSize)), [data?.length, pageSize]);

    // Reset page to 1 when data changes substantially
    const dataLen = data?.length || 0;
    const prevDataLenRef = React.useRef(dataLen);
    if (dataLen !== prevDataLenRef.current) {
        prevDataLenRef.current = dataLen;
        if (currentPage > Math.max(1, Math.ceil(dataLen / pageSize))) {
            setCurrentPage(1);
        }
    }

    const pageData = useMemo(() => {
        if (!data || data.length === 0) return [];
        const start = (currentPage - 1) * pageSize;
        return data.slice(start, start + pageSize);
    }, [data, currentPage, pageSize]);

    const goToPage = useCallback((page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    }, [totalPages]);

    const startRow = (currentPage - 1) * pageSize + 1;
    const endRow = Math.min(currentPage * pageSize, dataLen);

    return (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[11px] uppercase tracking-wider">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={col.key || i} className="px-6 py-3 font-semibold">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={`skel-${i}`}>
                                    {columns.map((col, j) => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-4 bg-zinc-100 rounded animate-pulse w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : error ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-red-500 text-lg">⚠</span>
                                        <p className="text-red-600 font-medium text-sm">{error}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : pageData.length > 0 ? (
                            pageData.map((row, i) => (
                                <tr 
                                    key={row.id || `row-${i}`} 
                                    className={`hover:bg-zinc-50/70 transition-colors text-zinc-700 ${onRowClick ? 'cursor-pointer' : ''}`}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                >
                                    {columns.map((col, j) => (
                                        <td key={col.key || j} className="px-6 py-4">
                                            {col.render ? col.render(row) : (row[col.key] ?? '—')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-zinc-300 text-2xl">📭</span>
                                        <p className="text-zinc-500 text-sm">{emptyMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer — only when data exceeds pageSize */}
            {!loading && !error && dataLen > pageSize && (
                <div className="bg-zinc-50 border-t border-zinc-200 px-6 py-3 flex items-center justify-between">
                    <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">
                        Showing {startRow}–{endRow} of {dataLen}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            className="px-2 py-1 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label="First page"
                        >
                            ««
                        </button>
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-2.5 py-1 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label="Previous page"
                        >
                            ‹ Prev
                        </button>
                        <span className="px-3 py-1 text-xs font-semibold text-zinc-900 bg-white border border-zinc-200 rounded">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-2.5 py-1 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label="Next page"
                        >
                            Next ›
                        </button>
                        <button
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="px-2 py-1 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label="Last page"
                        >
                            »»
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(DataTable);
