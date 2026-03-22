import React from 'react';

export default function DataTable({ columns, data, loading, emptyMessage = "No data available." }) {
    // Strict requirement: max 50 rows rendered
    const displayData = data ? data.slice(0, 50) : [];

    return (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[11px] uppercase tracking-wider">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i} className="px-6 py-3 font-semibold">{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-8 text-center text-zinc-400 animate-pulse">
                                    Loading data...
                                </td>
                            </tr>
                        ) : displayData.length > 0 ? (
                            displayData.map((row, i) => (
                                <tr key={i} className="hover:bg-zinc-50/50 transition-colors text-zinc-700">
                                    {columns.map((col, j) => (
                                        <td key={j} className="px-6 py-4">
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-8 text-center text-zinc-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {data && data.length > 50 && (
                <div className="bg-zinc-50 border-t border-zinc-200 p-3 text-center text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                    Showing 50 rows maximum for performance.
                </div>
            )}
        </div>
    );
}
