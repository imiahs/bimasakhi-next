'use client';

import React, { useState, useEffect } from 'react';
import Card from '../../../components/ui/Card';
import axios from 'axios';

const LeadsTab = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLeads = async () => {
            setLoading(true);
            try {
                const res = await axios.get('/api/leads-list');
                setLeads(res.data.leads || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeads();
    }, []);

    if (loading) return <div className="p-4">Loading Leads...</div>;

    return (
        <Card>
            <h3 className="mb-4 text-lg font-bold">Recent 50 Leads (Syncs with Zoho)</h3>
            <div style={{ overflowX: 'auto' }}>
                <table className="w-full text-left border-collapse" style={{ fontSize: '0.9em' }}>
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">Name</th>
                            <th className="p-2 border">Mobile</th>
                            <th className="p-2 border">Status</th>
                            <th className="p-2 border">Source</th>
                            <th className="p-2 border">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.map((lead, i) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                                <td className="p-2 border">{lead.Last_Name}</td>
                                <td className="p-2 border">******{String(lead.Mobile).slice(-4)}</td>
                                <td className="p-2 border">
                                    <span className={`px-2 py-1 rounded text-xs ${lead.Lead_Status === 'Converted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {lead.Lead_Status || 'New'}
                                    </span>
                                </td>
                                <td className="p-2 border">{lead.Lead_Source}</td>
                                <td className="p-2 border">{new Date(lead.Created_Time).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-500 mt-4">* Mobile masked for privacy. View full details in Zoho CRM.</p>
        </Card>
    );
};

export default LeadsTab;
