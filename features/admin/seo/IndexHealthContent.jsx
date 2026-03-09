'use client';

import React, { useState, useEffect } from 'react';

const IndexHealthContent = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/seo/index-health');
            const data = await res.json();
            if (data.success) {
                setMetrics(data.metrics);
            }
        } catch (error) {
            console.error('Failed to fetch SEO metrics', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    const MetricCard = ({ title, value, color = 'blue' }) => (
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
            <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
            <div className={`text-5xl font-bold text-${color}-600`}>{value}</div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 h-full p-6">
            <div className="admin-page-header flex justify-between items-center w-full">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">SEO Index Health</h1>
                    <p className="text-slate-500 mt-1">Monitor search crawler visibility, index penetration and sitemap status.</p>
                </div>
                <button
                    onClick={fetchMetrics}
                    disabled={loading}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition"
                >
                    {loading ? 'Compiling...' : 'Recalculate Health'}
                </button>
            </div>

            {loading && !metrics ? (
                <div className="p-8 text-center text-slate-500 animate-pulse bg-white rounded-xl border border-slate-200">
                    Aggregating index matrices...
                </div>
            ) : metrics ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <MetricCard title="Indexed Active Pages" value={metrics.indexed_pages} color="green" />
                    <MetricCard title="Pending Index Queue" value={metrics.pending_pages} color="orange" />
                    <MetricCard title="No-Index/Disabled" value={metrics.noindex_pages} color="slate" />
                    <MetricCard title="Crawl Error Events" value={metrics.crawl_errors} color="red" />
                </div>
            ) : (
                <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">
                    Unable to load SEO index matrices. DB connection severed.
                </div>
            )}
        </div>
    );
};

export default IndexHealthContent;
