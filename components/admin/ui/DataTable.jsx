'use client';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

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

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil((data?.length || 0) / pageSize)),
        [data?.length, pageSize]
    );

    const dataLength = data?.length || 0;

    useEffect(() => {
        if (currentPage > Math.max(1, Math.ceil(dataLength / pageSize))) {
            setCurrentPage(1);
        }
    }, [currentPage, dataLength, pageSize]);

    const pageData = useMemo(() => {
        if (!data || data.length === 0) return [];
        const start = (currentPage - 1) * pageSize;
        return data.slice(start, start + pageSize);
    }, [data, currentPage, pageSize]);

    const goToPage = useCallback((page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    }, [totalPages]);

    const startRow = (currentPage - 1) * pageSize + 1;
    const endRow = Math.min(currentPage * pageSize, dataLength);

    return (
        <div className="admin-panel overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                    <thead className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                            {columns.map((column, index) => (
                                <th key={column.key || index} className="px-5 py-3 font-semibold">
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-white/[0.04]">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, rowIndex) => (
                                <tr key={`skeleton-${rowIndex}`}>
                                    {columns.map((column, columnIndex) => (
                                        <td key={column.key || columnIndex} className="px-5 py-3.5">
                                            <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/[0.06]" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : error ? (
                            <tr>
                                <td colSpan={columns.length} className="px-5 py-10 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-lg text-rose-500">!</span>
                                        <p className="text-sm font-medium text-rose-600">{error}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : pageData.length > 0 ? (
                            pageData.map((row, index) => (
                                <tr
                                    key={row.id || `row-${index}`}
                                    className={`text-slate-300 transition-colors hover:bg-white/[0.03] ${onRowClick ? 'cursor-pointer' : ''}`}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                >
                                    {columns.map((column, columnIndex) => (
                                        <td key={column.key || columnIndex} className="px-5 py-3.5">
                                            {column.render ? column.render(row) : (row[column.key] ?? '--')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-5 py-10 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-2xl text-slate-600">[]</span>
                                        <p className="text-sm text-slate-500">{emptyMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && !error && dataLength > pageSize && (
                <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                        Showing {startRow}-{endRow} of {dataLength}
                    </p>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="First page"
                        >
                            {'<<'}
                        </button>
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Previous page"
                        >
                            Prev
                        </button>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-200">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Next page"
                        >
                            Next
                        </button>
                        <button
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Last page"
                        >
                            {'>>'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(DataTable);
