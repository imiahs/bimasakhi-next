'use client';

import React, { useState, useEffect } from 'react';

const ErrorsContent = () => {
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchErrors = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/errors');
            const data = await res.json();
            if (data.success && data.errors) {
                setErrors(data.errors);
            }
        } catch (error) {
            console.error('Failed to load system errors', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchErrors();
    }, []);

    const toggleResolve = async (id, currentResolved) => {
        try {
            const res = await fetch('/api/admin/errors', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, resolved: !currentResolved })
            });

            if (res.ok) {
                fetchErrors();
            }
        } catch (error) {
            console.error('Failed to resolve error', error);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full p-6">
            <div className="admin-page-header flex justify-between items-center w-full">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Error Monitor</h1>
                    <p className="text-slate-500 mt-1">Review captured application exceptions and runtime failures.</p>
                </div>
                <button
                    onClick={fetchErrors}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition"
                >
                    Refresh Logs
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Timestamp & Layer</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Error Message</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Source</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="p-8 text-center text-slate-500">Loading error telemetry...</td></tr>
                        ) : errors.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-slate-500">No system errors logged! 🎉</td></tr>
                        ) : (
                            errors.map(err => (
                                <tr key={err.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-4 whitespace-nowrap">
                                        <p className="font-mono text-xs text-slate-500">{new Date(err.created_at).toLocaleString()}</p>
                                        <p className="font-bold text-red-600 mt-1 text-sm">{err.layer}</p>
                                    </td>
                                    <td className="p-4 max-w-md">
                                        <p className="font-semibold text-slate-800 truncate" title={err.message}>{err.message}</p>
                                        {err.stack_trace && <p className="text-xs text-slate-400 font-mono truncate mt-1 cursor-help" title={err.stack_trace}>{err.stack_trace}</p>}
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">{err.source}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => toggleResolve(err.id, err.resolved)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${err.resolved ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                        >
                                            {err.resolved ? 'RESOLVED' : 'ACTIVE'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ErrorsContent;
