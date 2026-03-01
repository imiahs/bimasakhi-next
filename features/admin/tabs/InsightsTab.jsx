'use client';

import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import axios from 'axios';

const InsightsTab = () => {
    const [range, setRange] = useState('today');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStats();
    }, [range]);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`/api/admin-data/stats?range=${range}`);
            setStats(res.data);
        } catch (err) {
            console.error("Stats Error", err);
            setError("Could not load stats. Zoho might be busy.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="insights-dashboard">
            <div className="flex gap-4 mb-6">
                {['today', '7d', '30d'].map(r => (
                    <Button
                        key={r}
                        variant={range === r ? 'primary' : 'secondary'}
                        onClick={() => setRange(r)}
                        className="capitalize"
                    >
                        {r === 'today' ? 'Today' : `Last ${r.toUpperCase()}`}
                    </Button>
                ))}
                <Button variant="secondary" onClick={fetchStats}>↻ Refresh</Button>
            </div>

            {loading && <div className="p-8 text-center animate-pulse">Loading Insights...</div>}

            {error && <div className="alert-box error mb-4">{error}</div>}

            {stats && !loading && (
                <div className="stats-content">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Card className="text-center p-4">
                            <h3 className="text-gray-500 text-sm">Applications</h3>
                            <p className="text-3xl font-bold text-pink-600">{stats.totalApplications}</p>
                        </Card>
                        {/* Placeholders for future metrics */}
                        <Card className="text-center p-4 opacity-75">
                            <h3 className="text-gray-500 text-sm">Eligible (Est)</h3>
                            <p className="text-3xl font-bold">N/A*</p>
                        </Card>
                    </div>

                    {/* Attribution Table */}
                    <Card>
                        <h3 className="mb-4 text-lg font-bold">Traffic Sources</h3>
                        {stats.attribution.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        <th className="p-2">Source</th>
                                        <th className="p-2 text-right">Leads</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.attribution.map((row, i) => (
                                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="p-2">{row.source || '(Direct/None)'}</td>
                                            <td className="p-2 text-right font-bold">{row.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-gray-500 italic">No data for this period.</p>
                        )}
                    </Card>
                    <p className="text-xs text-gray-400 mt-2">* Some metrics require CRM schema updates (Phase 5.6)</p>
                </div>
            )}
        </div>
    );
};

export default InsightsTab;
