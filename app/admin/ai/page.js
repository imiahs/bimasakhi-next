'use client';
import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function AIPanelPage() {
    const [queue, setQueue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchQueue = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getQueueStatus();
            setQueue(res?.data || { pending: 0, processing: 0, completed: 0, failed: 0 });
        } catch (err) {
            console.error("Failed to load queue status", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 15000); // 15s refresh
        return () => clearInterval(interval);
    }, []);

    const triggerGeneration = async () => {
        if (!confirm('Manually trigger background SEO Generation queue?')) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/jobs/pagegen', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server error');
            setToast({ type: 'success', text: `Triggered successfully. ${data.processed || 0} items processed.` });
            fetchQueue();
        } catch (err) {
            setToast({ type: 'error', text: `Failed to trigger AI Engine: ${err.message}` });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 4000);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">AI Growth Engine</h1>
                    <p className="text-sm text-slate-500 mt-1">Monitor programmatic SEO generation queues running on Vercel endpoints natively.</p>
                </div>
                <button onClick={fetchQueue} disabled={loading} className="bg-white border text-sm font-medium border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm">
                    ↻ Sync Status
                </button>
            </div>

            {toast && (
                <div className={`p-4 rounded-lg font-medium shadow-sm transition-all ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {toast.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-700">Content Queue Topology</h3>
                        <p className="text-sm text-slate-500 mt-1">Pending items dynamically scaling.</p>
                        
                        <div className="mt-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-600 font-medium">Pending Tasks</span>
                                <span className="text-xl font-black text-indigo-600">{queue?.pending ?? '-'}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-600 font-medium">Processing Actively</span>
                                <span className="text-xl font-black text-emerald-600">{queue?.processing ?? '-'}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-600 font-medium">Completed Successfully</span>
                                <span className="text-xl font-black text-slate-800">{queue?.completed ?? '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 font-medium text-rose-600">Failed Retries</span>
                                <span className="text-xl font-black text-rose-600">{queue?.failed ?? '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-xl p-6 shadow-xl border border-slate-800 flex flex-col justify-center">
                    <h3 className="text-white font-bold text-lg mb-2">Manual Override Controls</h3>
                    <p className="text-slate-400 text-sm mb-6">Administrators can bypass chronological CRON constraints forcing isolated generations strictly bypassing time limits safely natively.</p>

                    <button 
                        onClick={triggerGeneration}
                        disabled={actionLoading}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all w-full flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {actionLoading ? (
                            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generating Content...</>
                        ) : '⚡ Generate Next SEO Payload'}
                    </button>
                </div>
            </div>
        </div>
    );
}
