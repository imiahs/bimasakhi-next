import React from 'react';

export default function DataTable({ columns, data, loading, emptyMessage = "No data available." }) {
    // Strict requirement: max 50 rows rendered
    const displayData = data ? data.slice(0, 50) : [];

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i} className="px-6 py-4 font-semibold">{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-400 animate-pulse">
                                    Loading data...
                                </td>
                            </tr>
                        ) : displayData.length > 0 ? (
                            displayData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors text-slate-700">
                                    {columns.map((col, j) => (
                                        <td key={j} className="px-6 py-4">
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {data && data.length > 50 && (
                <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-xs text-slate-500 font-medium">
                    Showing 50 rows maximum for performance.
                </div>
            )}
        </div>
    );
}
