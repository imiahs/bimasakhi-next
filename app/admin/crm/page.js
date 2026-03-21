'use client';
import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function CRMPage() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [convertingId, setConvertingId] = useState(null);
    const [conversionValue, setConversionValue] = useState(15000);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getLeads();
            setLeads(res.leads || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeads(); }, []);

    const handleConvert = async (e) => {
        e.preventDefault();
        if (!convertingId) return;
        setActionLoading(true);
        try {
            await adminApi.markConverted(convertingId, conversionValue);
            setToast({ type: 'success', text: 'Lead successfully marked as converted!' });
            setConvertingId(null);
            fetchLeads(); // Refresh data quietly
        } catch (err) {
            setToast({ type: 'error', text: `Failed: ${err.message}` });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">CRM Control Pipeline</h1>
                <button onClick={fetchLeads} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition shadow-sm">
                    ↻ Refresh Pipeline
                </button>
            </div>

            {toast && (
                <div className={`p-4 rounded-lg font-medium shadow-sm transition-all ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {toast.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
                        Fetching latest CRM data mappings...
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-rose-600 font-medium">Failed to load leads: {error}</div>
                ) : leads.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No leads captured yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Prospect Identity</th>
                                    <th className="px-6 py-4 font-bold">Contact</th>
                                    <th className="px-6 py-4 font-bold">Location</th>
                                    <th className="px-6 py-4 font-bold">Source</th>
                                    <th className="px-6 py-4 font-bold">Entry Time</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.map((lead, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                                        <td className="px-6 py-4 font-medium text-slate-800">{lead.Last_Name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-slate-600">{lead.Mobile || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 text-slate-600 py-1 px-2.5 rounded text-xs font-semibold">{lead.City || 'N/A'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{lead.Lead_Source || 'Organic'}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(lead.Created_Time).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setConvertingId(lead.id || lead.Last_Name)} // Temporary mock logic mapping ID if available natively
                                                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            >
                                                Mark Converted
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL OVERLAY */}
            {convertingId && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">Log Conversion Target</h2>
                            <p className="text-sm text-slate-500 mt-1">Attribute estimated revenue generation to this pipeline prospect.</p>
                        </div>
                        <form onSubmit={handleConvert} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Estimated Revenue (₹)</label>
                                <input 
                                    type="number" 
                                    value={conversionValue}
                                    onChange={e => setConversionValue(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    required
                                    min="0"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setConvertingId(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="flex-1 px-4 py-2 bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
                                    {actionLoading ? 'Saving...' : 'Confirm Action'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
