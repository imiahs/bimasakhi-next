'use client';

import React, { useState, useEffect, useCallback } from 'react';

export default function GeoIntelligencePage() {
    const [coverage, setCoverage] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    const [localities, setLocalities] = useState([]);
    const [localityStats, setLocalityStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [localityLoading, setLocalityLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCoverage = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/locations/coverage');
            const data = await res.json();
            if (data.success) {
                setCoverage(data);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCoverage(); }, [fetchCoverage]);

    const fetchLocalities = async (cityId) => {
        setLocalityLoading(true);
        try {
            const res = await fetch(`/api/admin/locations/localities?city_id=${cityId}&active=false`);
            const data = await res.json();
            if (data.success) {
                setLocalities(data.data);
                setLocalityStats(data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch localities:', err);
        } finally {
            setLocalityLoading(false);
        }
    };

    const selectCity = (city) => {
        setSelectedCity(city);
        fetchLocalities(city.id);
    };

    const toggleLocality = async (localityId, currentActive) => {
        try {
            const res = await fetch(`/api/admin/locations/localities/${localityId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !currentActive })
            });
            const data = await res.json();
            if (data.success) {
                setLocalities(prev => prev.map(l =>
                    l.id === localityId ? { ...l, active: !currentActive } : l
                ));
                fetchCoverage();
            }
        } catch (err) {
            console.error('Toggle failed:', err);
        }
    };

    const setPriority = async (localityId, priority) => {
        try {
            const res = await fetch(`/api/admin/locations/localities/${localityId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority })
            });
            const data = await res.json();
            if (data.success) {
                setLocalities(prev => prev.map(l =>
                    l.id === localityId ? { ...l, priority } : l
                ));
            }
        } catch (err) {
            console.error('Priority update failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-4">Geo Intelligence</h1>
                <div className="text-slate-400">Loading coverage data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-4">Geo Intelligence</h1>
                <div className="text-red-400">Error: {error}</div>
            </div>
        );
    }

    const s = coverage?.summary || {};
    const priorityLabels = { 1: 'P1 — Critical', 2: 'P2 — High', 3: 'P3 — Medium', 4: 'P4 — Low', 5: 'P5 — Expansion' };
    const priorityColors = { 1: 'text-red-400', 2: 'text-orange-400', 3: 'text-yellow-400', 4: 'text-blue-400', 5: 'text-slate-400' };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Geo Intelligence Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-1">Bible Section 13 — Multi-City + Pincode Micro-Local Engine</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-white">{s.overall_coverage_pct || 0}%</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Overall Coverage</div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Cities', value: s.total_cities, color: 'border-blue-500' },
                    { label: 'Localities', value: s.active_localities, color: 'border-indigo-500' },
                    { label: 'Pincodes', value: s.total_pincodes, color: 'border-purple-500' },
                    { label: 'Total Pages', value: s.total_pages, color: 'border-emerald-500' },
                    { label: 'Active Pages', value: s.active_pages, color: 'border-green-500' },
                    { label: 'With Pages', value: s.localities_with_pages, color: 'border-cyan-500' },
                ].map((card, i) => (
                    <div key={i} className={`admin-panel rounded-xl p-4 text-center border-t-2 ${card.color}`}>
                        <div className="text-2xl font-bold text-white">{card.value || 0}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* City Coverage Grid */}
            <div className="admin-panel rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-4">City Coverage</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coverage?.cities?.map(city => {
                        const isSelected = selectedCity?.id === city.id;
                        return (
                            <button
                                key={city.id}
                                onClick={() => selectCity(city)}
                                className={`text-left p-4 rounded-xl border transition-all ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-white/[0.06] hover:border-white/[0.15] bg-white/[0.02]'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="text-white font-semibold">{city.city_name}</div>
                                        <div className="text-xs text-slate-500">{city.state}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-white">{city.coverage_pct || 0}%</div>
                                    </div>
                                </div>
                                <div className="flex gap-4 text-xs text-slate-400">
                                    <span>Pop: {(city.population || 0).toLocaleString()}</span>
                                    <span>Loc: {city.locality_count || 0}</span>
                                    <span>Pages: {city.page_count || 0}</span>
                                </div>
                                {/* Coverage bar */}
                                <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all"
                                        style={{ width: `${Math.min(city.coverage_pct || 0, 100)}%` }}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Locality Detail for Selected City */}
            {selectedCity && (
                <div className="admin-panel rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {selectedCity.city_name} — Localities
                            </h2>
                            {localityStats && (
                                <p className="text-sm text-slate-400 mt-1">
                                    {localityStats.total} total • {localityStats.with_pages} with pages • {localityStats.coverage_pct}% coverage
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => { setSelectedCity(null); setLocalities([]); }}
                            className="text-slate-400 hover:text-white text-sm"
                        >
                            ✕ Close
                        </button>
                    </div>

                    {localityLoading ? (
                        <div className="text-slate-400 py-4">Loading localities...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/[0.06] text-xs text-slate-500 uppercase">
                                        <th className="p-3">Locality</th>
                                        <th className="p-3">Slug</th>
                                        <th className="p-3">Priority</th>
                                        <th className="p-3">Page</th>
                                        <th className="p-3">Active</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {localities.map(loc => (
                                        <tr key={loc.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                                            <td className="p-3 text-slate-200 font-medium">{loc.locality_name}</td>
                                            <td className="p-3 text-slate-500 font-mono text-xs">{loc.slug}</td>
                                            <td className="p-3">
                                                <select
                                                    value={loc.priority}
                                                    onChange={(e) => setPriority(loc.id, parseInt(e.target.value))}
                                                    className={`bg-transparent text-xs font-medium ${priorityColors[loc.priority]} cursor-pointer`}
                                                >
                                                    {[1, 2, 3, 4, 5].map(p => (
                                                        <option key={p} value={p} className="bg-slate-800">{priorityLabels[p]}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                {loc.has_page ? (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                                        ✓ Generated
                                                    </span>
                                                ) : (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-500">
                                                        — None
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <button
                                                    onClick={() => toggleLocality(loc.id, loc.active)}
                                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                                        loc.active
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                    }`}
                                                >
                                                    {loc.active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="text-xs text-slate-500">
                                                    {loc.pincode_count || 0} pincodes
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Expansion Targets */}
            {coverage?.expansion_targets?.length > 0 && (
                <div className="admin-panel rounded-2xl p-5">
                    <h2 className="text-lg font-bold text-white mb-1">Expansion Targets</h2>
                    <p className="text-sm text-slate-400 mb-4">Active localities without generated pages — sorted by priority</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        {coverage.expansion_targets.map(target => (
                            <div
                                key={target.id}
                                className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]"
                            >
                                <div className="text-sm text-white font-medium">{target.locality_name}</div>
                                <div className="text-xs text-slate-500">
                                    {target.cities?.city_name} • P{target.priority}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
