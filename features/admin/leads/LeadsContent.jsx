'use client';

import React, { useState } from 'react';
import './Leads.css';

const mockLeads = [
    { id: 'LD-001', name: 'Priya Sharma', mobile: '9876543210', city: 'Delhi', source: 'Google Ads', status: 'new', date: '2026-03-09' },
    { id: 'LD-002', name: 'Anjali Verma', mobile: '9123456780', city: 'Noida', source: 'Blog SEO', status: 'contacted', date: '2026-03-08' },
    { id: 'LD-003', name: 'Sunita Devi', mobile: '9988776655', city: 'Gurgaon', source: 'Direct', status: 'new', date: '2026-03-08' },
];

const LeadsContent = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('All');

    const handleExport = () => {
        alert("Exporting to CSV...");
    };

    return (
        <div className="admin-leads-wrapper">
            <div className="admin-page-header">
                <h1>Leads Manager</h1>
                <p>Manage, view attribution, and export CRM synchronizations.</p>
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
                        <option value="Google Ads">Google Ads</option>
                        <option value="Blog SEO">Blog SEO</option>
                        <option value="Direct">Direct</option>
                    </select>
                    <select className="leads-filter-select">
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
                <button className="btn-export" onClick={handleExport}>
                    <span>⬇️</span> Export CSV
                </button>
            </div>

            <div className="leads-table-container">
                <table className="leads-table">
                    <thead>
                        <tr>
                            <th>Lead Details</th>
                            <th>Location</th>
                            <th>Source</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockLeads.map(lead => (
                            <tr key={lead.id}>
                                <td>
                                    <p className="lead-name">{lead.name}</p>
                                    <p className="lead-phone">{lead.mobile}</p>
                                </td>
                                <td>{lead.city}</td>
                                <td><span className="badge-source">{lead.source}</span></td>
                                <td><span className={`badge-status status-${lead.status}`}>{lead.status.toUpperCase()}</span></td>
                                <td>{lead.date}</td>
                                <td>
                                    <button className="text-blue-600 font-medium hover:underline">View Journey</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeadsContent;
