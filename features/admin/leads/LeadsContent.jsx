'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DataTable from '@/components/admin/ui/DataTable';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import FilterBar from '@/components/admin/ui/FilterBar';

const LeadsContent = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [cityFilter, setCityFilter] = useState('All');
    const [scoreFilter, setScoreFilter] = useState('All');

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/admin/leads');
            const data = await res.json();
            if (data.leads) {
                setLeads(data.leads);
            }
        } catch (err) {
            console.error('Failed to fetch leads', err);
            setError('Failed to load leads. Check network connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = useCallback(() => {
        if (filteredLeads.length === 0) {
            alert("No leads to export.");
            return;
        }

        const headers = ['ID', 'Name', 'Mobile', 'City', 'Score', 'Status', 'Date'];
        const csvRows = [headers.join(',')];

        filteredLeads.forEach(lead => {
            const score = lead.lead_score || lead.score || 0;
            const row = [
                lead.id,
                `"${lead.name}"`,
                lead.mobile,
                `"${lead.city || ''}"`,
                score,
                lead.status,
                new Date(lead.created_at).toISOString()
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `leads_export_${Date.now()}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, []);

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const matchesSearch = !searchTerm || 
                lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                lead.mobile?.includes(searchTerm);
            const matchesCity = cityFilter === 'All' || 
                lead.city === cityFilter || 
                (!lead.city && cityFilter === 'Unknown');
            
            const score = lead.lead_score || lead.score || 0;
            let matchesScore = true;
            if (scoreFilter === 'High (>80)') matchesScore = score >= 80;
            if (scoreFilter === 'Medium (50-80)') matchesScore = score >= 50 && score < 80;
            if (scoreFilter === 'Low (<50)') matchesScore = score < 50;

            return matchesSearch && matchesCity && matchesScore;
        });
    }, [leads, searchTerm, cityFilter, scoreFilter]);

    const uniqueCities = useMemo(() => {
        return Array.from(new Set(leads.map(l => l.city).filter(Boolean)));
    }, [leads]);

    const hasUnknowns = useMemo(() => leads.some(l => !l.city), [leads]);

    // Build filter config for FilterBar
    const cityOptions = useMemo(() => {
        const opts = [{ value: 'All', label: 'All Cities' }];
        uniqueCities.forEach(city => opts.push({ value: city, label: city }));
        if (hasUnknowns) opts.push({ value: 'Unknown', label: 'Unknown' });
        return opts;
    }, [uniqueCities, hasUnknowns]);

    const scoreOptions = [
        { value: 'All', label: 'All Scores' },
        { value: 'High (>80)', label: 'High (>80)' },
        { value: 'Medium (50-80)', label: 'Medium (50-80)' },
        { value: 'Low (<50)', label: 'Low (<50)' }
    ];

    const filters = useMemo(() => [
        { key: 'city', label: 'City Filter', value: cityFilter, options: cityOptions, onChange: setCityFilter },
        { key: 'score', label: 'Score Filter', value: scoreFilter, options: scoreOptions, onChange: setScoreFilter }
    ], [cityFilter, cityOptions, scoreFilter]);

    const columns = useMemo(() => [
        {
            key: 'name', label: 'Lead Details', render: (row) => (
                <div>
                    <div className="font-semibold text-zinc-900 tracking-tight">{row.name}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">{row.mobile}</div>
                </div>
            )
        },
        { key: 'city', label: 'City', render: (row) => <span className="text-zinc-600">{row.city || '—'}</span> },
        { 
            key: 'score', label: 'Lead Score', render: (row) => {
                const s = row.lead_score || row.score || 0;
                let color = 'text-zinc-400';
                if (s >= 80) color = 'text-emerald-600 font-semibold';
                else if (s >= 50) color = 'text-yellow-600 font-medium';
                return <span className={color}>{s}</span>;
            }
        },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status === 'pending_sync' ? 'Draft' : row.status} /> },
        { key: 'date', label: 'Date', render: (row) => <span className="text-zinc-500 text-xs">{new Date(row.created_at).toLocaleDateString()}</span> }
    ], []);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center bg-white px-6 py-5 rounded-xl border border-zinc-200">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Leads Intelligence</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        {loading ? 'Loading...' : `${filteredLeads.length} leads${filteredLeads.length !== leads.length ? ` (filtered from ${leads.length})` : ''}`}
                    </p>
                </div>
                <button 
                    onClick={handleExport} 
                    className="bg-white border text-sm font-medium border-zinc-200 text-zinc-600 px-4 py-2 rounded-md hover:bg-zinc-50 hover:text-zinc-900 transition-colors flex items-center gap-2"
                >
                    <span className="opacity-70">⬇️</span> Export CSV
                </button>
            </div>

            {/* FilterBar Component */}
            <FilterBar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search by name or mobile..."
                filters={filters}
            />

            {/* DataTable with Pagination */}
            <DataTable 
                columns={columns} 
                data={filteredLeads} 
                loading={loading}
                error={error}
                emptyMessage="No leads match your criteria."
                pageSize={20}
            />
        </div>
    );
};

export default LeadsContent;
