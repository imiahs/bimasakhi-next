'use client';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';

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
    const previousLengthRef = useRef(dataLength);

    if (dataLength !== previousLengthRef.current) {
        previousLengthRef.current = dataLength;
        if (currentPage > Math.max(1, Math.ceil(dataLength / pageSize))) {
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
    const endRow = Math.min(currentPage * pageSize, dataLength);

    return (
        <div className="admin-panel overflow-hidden rounded-[1.75rem]">
            <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                    <thead className="border-b border-[rgba(77,61,40,0.08)] bg-[rgba(255,255,255,0.72)] text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                        <tr>
                            {columns.map((column, index) => (
                                <th key={column.key || index} className="px-6 py-3 font-semibold">
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-[rgba(77,61,40,0.06)]">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, rowIndex) => (
                                <tr key={`skeleton-${rowIndex}`}>
                                    {columns.map((column, columnIndex) => (
                                        <td key={column.key || columnIndex} className="px-6 py-4">
                                            <div className="h-4 w-3/4 animate-pulse rounded-full bg-zinc-200/70" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : error ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center">
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
                                    className={`text-zinc-700 transition-colors hover:bg-[rgba(255,255,255,0.52)] ${onRowClick ? 'cursor-pointer' : ''}`}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                >
                                    {columns.map((column, columnIndex) => (
                                        <td key={column.key || columnIndex} className="px-6 py-4">
                                            {column.render ? column.render(row) : (row[column.key] ?? '--')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-2xl text-zinc-300">[]</span>
                                        <p className="text-sm text-zinc-500">{emptyMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && !error && dataLength > pageSize && (
                <div className="flex items-center justify-between border-t border-[rgba(77,61,40,0.08)] bg-[rgba(255,255,255,0.58)] px-6 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                        Showing {startRow}-{endRow} of {dataLength}
                    </p>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="First page"
                        >
                            {'<<'}
                        </button>
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Previous page"
                        >
                            Prev
                        </button>
                        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-900">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Next page"
                        >
                            Next
                        </button>
                        <button
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
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
