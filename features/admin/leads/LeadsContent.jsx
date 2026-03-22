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
                    <div className="font-semibold text-slate-800">{row.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{row.mobile}</div>
                </div>
            )
        },
        { key: 'city', label: 'City', render: (row) => <span className="text-slate-600">{row.city || '-'}</span> },
        { 
            key: 'score', label: 'Score', render: (row) => {
                const s = row.lead_score || row.score || 0;
                let color = 'text-slate-400';
                if (s >= 80) color = 'text-emerald-600 font-bold';
                else if (s >= 50) color = 'text-yellow-600 font-semibold';
                return <span className={color}>{s}</span>;
            }
        },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status === 'pending_sync' ? 'Draft' : row.status} /> },
        { key: 'date', label: 'Date', render: (row) => <span className="text-slate-500 text-xs">{new Date(row.created_at).toLocaleDateString()}</span> }
    ];

    const uniqueCities = Array.from(new Set(leads.map(l => l.city).filter(Boolean)));
    const hasUnknowns = leads.some(l => !l.city);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Leads Intelligence</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and filter leads natively routed to agents.</p>
                </div>
                <button onClick={handleExport} className="bg-slate-50 border text-sm font-semibold border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition shadow-sm flex items-center gap-2">
                    <span>⬇️</span> Export CSV
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by name or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700"
                    />
                </div>
                
                <select 
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    value={cityFilter} 
                    onChange={(e) => setCityFilter(e.target.value)}
                >
                    <option value="All">All Cities</option>
                    {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
                    {hasUnknowns && <option value="Unknown">Unknown</option>}
                </select>

                <select 
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
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
