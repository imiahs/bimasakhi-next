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
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <MetricCard title="Indexed Active Pages" value={metrics.indexed_pages} color="green" />
                        <MetricCard title="Pending Index Queue" value={metrics.pending_pages} color="orange" />
                        <MetricCard title="No-Index/Disabled" value={metrics.noindex_pages} color="slate" />
                        <MetricCard title="Orphan Pages Flagged" value={metrics.orphan_pages} color="red" />
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 mt-6">
                        <h3 className="font-semibold text-slate-800 mb-4">Crawl Priority Distribution</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                <div className="text-sm font-medium text-green-700 uppercase">High Priority</div>
                                <div className="text-3xl font-bold text-green-600 mt-2">{metrics.priority_high}</div>
                                <p className="text-xs text-green-500 mt-1">Crawled frequently (Score &gt; 80)</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div className="text-sm font-medium text-blue-700 uppercase">Medium Priority</div>
                                <div className="text-3xl font-bold text-blue-600 mt-2">{metrics.priority_medium}</div>
                                <p className="text-xs text-blue-500 mt-1">Crawled periodically (Score 40-80)</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="text-sm font-medium text-slate-700 uppercase">Low Priority</div>
                                <div className="text-3xl font-bold text-slate-600 mt-2">{metrics.priority_low}</div>
                                <p className="text-xs text-slate-500 mt-1">Rarely crawled (Score &lt; 40)</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">
                    Unable to load SEO index matrices. DB connection severed.
                </div>
            )}
        </div>
    );
};

export default IndexHealthContent;
