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
            
            // PRIORITY ENGINE: Enhance Leads payload sorting High -> Medium -> Low
            const mappedLeads = (res.leads || []).map(lead => {
                const score = lead.lead_score || 0;
                let priorityCode = 'Low';
                let priorityWeight = 1;
                
                if (score >= 80) { priorityCode = 'Hot'; priorityWeight = 3; }
                else if (score >= 50) { priorityCode = 'Medium'; priorityWeight = 2; }
                
                return { ...lead, raw_score: score, priorityCode, priorityWeight };
            });
            
            // Sort by numerical weight descending strictly
            const sorted = mappedLeads.sort((a,b) => b.priorityWeight - a.priorityWeight);
            
            setLeads(sorted);
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

    const getPriorityBadge = (code) => {
        if (code === 'Hot') return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold border border-rose-200 shadow-sm uppercase">🔥 High</span>;
        if (code === 'Medium') return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold border border-amber-200 shadow-sm uppercase">Medium</span>;
        return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs font-bold border border-slate-200 shadow-sm uppercase">Low</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">CRM Conversion Pipeline</h1>
                    <p className="text-sm text-slate-500 mt-1">Autonomous prioritization scoring highlighting targets mathematically bounding revenue closures.</p>
                </div>
                <button onClick={fetchLeads} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition shadow-sm">
                    ↻ Sync Pipeline
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
                        Scoring lead probabilities...
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
                                    <th className="px-6 py-4 font-bold">Priority Target</th>
                                    <th className="px-6 py-4 font-bold">Prospect Identity</th>
                                    <th className="px-6 py-4 font-bold">Contact</th>
                                    <th className="px-6 py-4 font-bold">Location Analytics</th>
                                    <th className="px-6 py-4 font-bold">Vector Source</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.map((lead, idx) => (
                                    <tr key={idx} className={`hover:bg-slate-50/50 transition ${lead.is_converted ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                {getPriorityBadge(lead.priorityCode)}
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-0.5">Score: {lead.raw_score}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{lead.Last_Name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-slate-600">{lead.Mobile || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 text-slate-600 py-1 px-2.5 rounded text-xs font-semibold border border-slate-200">{lead.City || 'N/A'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{lead.Lead_Source || 'Organic'}</td>
                                        <td className="px-6 py-4 text-right">
                                            {lead.is_converted ? (
                                                <span className="text-emerald-600 font-bold text-xs flex items-center justify-end gap-1">
                                                    ✓ Closed (₹{(lead.conversion_value || 0).toLocaleString()})
                                                </span>
                                            ) : (
                                                <button 
                                                    onClick={() => setConvertingId(lead.id || lead.Last_Name)}
                                                    className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                >
                                                    Mark Converted
                                                </button>
                                            )}
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
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800">Log Revenue Attribution</h2>
                            <p className="text-sm text-slate-500 mt-1">Bind mathematical revenue outputs tracking scaling arrays conclusively.</p>
                        </div>
                        <form onSubmit={handleConvert} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Estimated Pipeline Revenue (₹)</label>
                                <input 
                                    type="number" 
                                    value={conversionValue}
                                    onChange={e => setConversionValue(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold"
                                    required
                                    min="0"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setConvertingId(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg border border-slate-200 hover:bg-slate-200 transition">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="flex-1 px-4 py-2 bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition">
                                    {actionLoading ? 'Synchronizing...' : 'Confirm Pipeline'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
