'use client';

import React, { useState, useEffect } from 'react';
import './Leads.css';

const LeadsContent = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('all');

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

        const headers = ['ID', 'Name', 'Mobile', 'City', 'Source', 'Status', 'Storage', 'Date'];
        const csvRows = [headers.join(',')];

        filteredLeads.forEach(lead => {
            const row = [
                lead.id,
                `"${lead.name}"`,
                lead.mobile,
                `"${lead.city || ''}"`,
                `"${lead.source || ''}"`,
                lead.status,
                lead.storage,
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

    // Derived State for Filtering
    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.mobile?.includes(searchTerm);

        const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter;

        // Date Logic
        let matchesDate = true;
        if (dateFilter !== 'all') {
            const leadDate = new Date(lead.created_at);
            const now = new Date();
            const diffDays = Math.ceil(Math.abs(now - leadDate) / (1000 * 60 * 60 * 24));

            if (dateFilter === '7' && diffDays > 7) matchesDate = false;
            if (dateFilter === '30' && diffDays > 30) matchesDate = false;
        }

        return matchesSearch && matchesSource && matchesDate;
    });

    return (
        <div className="admin-leads-wrapper">
            <div className="admin-page-header">
                <h1>Leads Manager</h1>
                <p>Manage, view attribution, and export CRM synchronizations. Displays both Supabase Cache and unsynced local fallbacks.</p>
            </div>

            <div className="leads-toolbar">
                <div className="leads-filters">
                    <div className="leads-search">
                        <input
                            type="text"
                            placeholder="Search by name or mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select className="leads-filter-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                        <option value="All">All Sources</option>
                        {Array.from(new Set(leads.map(l => l.source).filter(Boolean))).map(src => (
                            <option key={src} value={src}>{src}</option>
                        ))}
                    </select>
                    <select className="leads-filter-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                        <option value="all">All Time</option>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                    </select>
                </div>
                <button className="btn-export" onClick={handleExport}>
                    <span>⬇️</span> Export CSV
                </button>
            </div>

            <div className="leads-table-container">
                {loading ? (
                    <p style={{ padding: '20px' }}>Loading leads...</p>
                ) : (
                    <table className="leads-table">
                        <thead>
                            <tr>
                                <th>Lead Details</th>
                                <th>Location</th>
                                <th>Source</th>
                                <th>Storage / Status</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.length > 0 ? (
                                filteredLeads.map(lead => (
                                    <tr key={lead.id}>
                                        <td>
                                            <p className="lead-name">{lead.name}</p>
                                            <p className="lead-phone">{lead.mobile}</p>
                                        </td>
                                        <td>{lead.city || '-'}</td>
                                        <td><span className="badge-source">{lead.source || 'Organic'}</span></td>
                                        <td>
                                            <span style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                                                {lead.storage}
                                            </span>
                                            <span className={`badge-status status-${lead.status === 'pending_sync' ? 'draft' : 'published'}`}>
                                                {lead.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <button className="text-blue-600 font-medium hover:underline">View Journey</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No leads match your criteria.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default LeadsContent;
