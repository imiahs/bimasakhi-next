'use client';

import React from 'react';

const mockAutomations = [
    { id: 1, trigger: 'New Lead Generated', action: 'Send CRM Sync webhook', status: 'Active' },
    { id: 2, trigger: 'Lead Contacted', action: 'Send WhatsApp Welcome Message', status: 'Active' },
    { id: 3, trigger: 'Resource Downloaded', action: 'Add lead to Newsletter Email Sequence', status: 'Paused' },
];

const AutomationContent = () => {
    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="admin-page-header">
                <h1>Workflow Automations</h1>
                <p>Configure automatic triggers tying lead behaviors to downstream actions.</p>
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                <button className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition">
                    + Create Workflow
                </button>
            </div>

            <div className="flex flex-col gap-4">
                {mockAutomations.map(auto => (
                    <div key={auto.id} className="bg-white p-5 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">TRIGGER: {auto.trigger}</p>
                            <h3 className="text-slate-800 font-semibold text-lg">ACTION: {auto.action}</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${auto.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {auto.status}
                            </span>
                            <button className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AutomationContent;
