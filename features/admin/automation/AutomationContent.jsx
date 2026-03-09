'use client';

import React, { useState, useEffect } from 'react';

const AutomationContent = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // New Rule State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        trigger_event: 'lead_created',
        conditions: '[{"field": "source", "operator": "equals", "value": "blog"}]',
        actions: '[{"type": "add_tag", "value": "content-lead"}]'
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/automation');
            const data = await res.json();
            if (data.rules) {
                setRules(data.rules);
            }
        } catch (error) {
            console.error('Failed to load rules', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            // Parse JSON strings to real objects for DB insertion
            const payload = {
                ...formData,
                conditions: JSON.parse(formData.conditions),
                actions: JSON.parse(formData.actions)
            };

            const res = await fetch('/api/admin/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                setIsCreating(false);
                fetchRules();
            } else {
                alert('Creation failed: ' + data.error);
            }
        } catch (error) {
            alert('Error parsing JSON or connecting to server.');
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const res = await fetch('/api/admin/automation', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_active: !currentStatus })
            });

            if (res.ok) {
                fetchRules();
            }
        } catch (error) {
            console.error('Status toggle failed', error);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full p-6">
            {!isCreating ? (
                <>
                    <div className="admin-page-header flex justify-between items-center w-full">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Automation Engine</h1>
                            <p className="text-slate-500 mt-1">Configure event-driven "If This Then That" rules for systemic triggers.</p>
                        </div>
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition"
                            onClick={() => setIsCreating(true)}
                        >
                            + Create Rule
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Rule Name</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Trigger Event</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="3" className="p-8 text-center text-slate-500">Loading rules...</td></tr>
                                ) : rules.length === 0 ? (
                                    <tr><td colSpan="3" className="p-8 text-center text-slate-500">No automation rules configured.</td></tr>
                                ) : (
                                    rules.map(rule => (
                                        <tr key={rule.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-4">
                                                <p className="font-semibold text-slate-800">{rule.name}</p>
                                                <p className="text-xs text-slate-500 mt-1">{rule.description}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-mono">{rule.trigger_event}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => toggleStatus(rule.id, rule.is_active)}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold ${rule.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                >
                                                    {rule.is_active ? 'ACTIVE' : 'DISABLED'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 w-full max-w-3xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Create Automation Rule</h2>
                        <button className="text-slate-500 hover:text-slate-700" onClick={() => setIsCreating(false)}>Cancel</button>
                    </div>

                    <form onSubmit={handleCreate} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Rule Name</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                            <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Trigger Event</label>
                            <select value={formData.trigger_event} onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value })} className="w-full p-2 border rounded font-mono text-sm">
                                <option value="lead_created">lead_created</option>
                                <option value="calculator_used">calculator_used</option>
                                <option value="resource_downloaded">resource_downloaded</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Conditions (JSON Array)</label>
                            <textarea value={formData.conditions} onChange={(e) => setFormData({ ...formData, conditions: e.target.value })} className="w-full p-2 border rounded font-mono text-sm" rows="3" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Actions (JSON Array)</label>
                            <textarea value={formData.actions} onChange={(e) => setFormData({ ...formData, actions: e.target.value })} className="w-full p-2 border rounded font-mono text-sm" rows="3" required />
                        </div>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-semibold transition mt-2">
                            Deploy Automation Rule
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AutomationContent;
