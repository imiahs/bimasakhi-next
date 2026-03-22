'use client';

import React, { useState, useEffect } from 'react';
import DataTable from '@/components/admin/ui/DataTable';
import StatusBadge from '@/components/admin/ui/StatusBadge';

const LeadsContent = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cityFilter, setCityFilter] = useState('All');
    const [scoreFilter, setScoreFilter] = useState('All');

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/leads');
            const data = await res.json();
            if (data.leads) {
                setLeads(data.leads);
            }
        } catch (error) {
            console.error('Failed to fetch leads', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
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
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || lead.mobile?.includes(searchTerm);
        const matchesCity = cityFilter === 'All' || lead.city === cityFilter || (!lead.city && cityFilter === 'Unknown');
        
        const score = lead.lead_score || lead.score || 0;
        let matchesScore = true;
        if (scoreFilter === 'High (>80)') matchesScore = score >= 80;
        if (scoreFilter === 'Medium (50-80)') matchesScore = score >= 50 && score < 80;
        if (scoreFilter === 'Low (<50)') matchesScore = score < 50;

        return matchesSearch && matchesCity && matchesScore;
    });

    const columns = [
        {
            key: 'name', label: 'Lead Details', render: (row) => (
                <div>
                    <div className="font-semibold text-zinc-900 tracking-tight">{row.name}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">{row.mobile}</div>
                </div>
            )
        },
        { key: 'city', label: 'City', render: (row) => <span className="text-zinc-600">{row.city || '-'}</span> },
        { 
            key: 'score', label: 'Score', render: (row) => {
                const s = row.lead_score || row.score || 0;
                let color = 'text-zinc-400';
                if (s >= 80) color = 'text-emerald-600 font-semibold';
                else if (s >= 50) color = 'text-yellow-600 font-medium';
                return <span className={color}>{s}</span>;
            }
        },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status === 'pending_sync' ? 'Draft' : row.status} /> },
        { key: 'date', label: 'Date', render: (row) => <span className="text-zinc-500 text-xs">{new Date(row.created_at).toLocaleDateString()}</span> }
    ];

    const uniqueCities = Array.from(new Set(leads.map(l => l.city).filter(Boolean)));
    const hasUnknowns = leads.some(l => !l.city);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white px-6 py-5 rounded-xl border border-zinc-200">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Leads Intelligence</h1>
                    <p className="text-sm text-zinc-500 mt-1">Manage and filter leads natively routed to agents.</p>
                </div>
                <button onClick={handleExport} className="bg-white border text-sm font-medium border-zinc-200 text-zinc-600 px-4 py-2 rounded-md hover:bg-zinc-50 hover:text-zinc-900 transition-colors flex items-center gap-2">
                    <span className="opacity-70">⬇️</span> Export CSV
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">🔎</span>
                    <input
                        type="text"
                        placeholder="Search by name or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-50/50 border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors text-zinc-800"
                    />
                </div>
                
                <select 
                    className="bg-zinc-50/50 border border-zinc-200 text-zinc-800 text-sm rounded-md px-4 py-2 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors"
                    value={cityFilter} 
                    onChange={(e) => setCityFilter(e.target.value)}
                >
                    <option value="All">All Cities</option>
                    {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
                    {hasUnknowns && <option value="Unknown">Unknown</option>}
                </select>

                <select 
                    className="bg-zinc-50/50 border border-zinc-200 text-zinc-800 text-sm rounded-md px-4 py-2 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors"
                    value={scoreFilter} 
                    onChange={(e) => setScoreFilter(e.target.value)}
                >
                    <option value="All">All Scores</option>
                    <option value="High (>80)">High (&gt;80)</option>
                    <option value="Medium (50-80)">Medium (50-80)</option>
                    <option value="Low (<50)">Low (&lt;50)</option>
                </select>
            </div>

            <DataTable 
                columns={columns} 
                data={filteredLeads} 
                loading={loading} 
                emptyMessage="No leads match your criteria."
            />
        </div>
    );
};

export default LeadsContent;
