'use client';

import React, { useState, useEffect } from 'react';

const SettingsContent = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [systemOffline, setSystemOffline] = useState(false);

    useEffect(() => {
        const checkSystem = async () => {
            try {
                const res = await fetch('/api/admin/system');
                const data = await res.json();
                if (data.overall === 'red') setSystemOffline(true);
            } catch {
                setSystemOffline(true);
            }
        };
        checkSystem();
    }, []);

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="admin-page-header">
                <h1>Platform Settings</h1>
                <p>Global configuration, API hooks, and environment variables.</p>
                {systemOffline && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-200">
                        <strong>Warning:</strong> Core services (Redis/DB) are offline. Some settings may fail to save.
                    </div>
                )}
            </div>

            <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Settings Sidebar */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-2">
                    <button
                        className={`text-left px-4 py-2 font-medium rounded-lg ${activeTab === 'general' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                        onClick={() => setActiveTab('general')}
                    >
                        ⚙️ General Info
                    </button>
                    <button
                        className={`text-left px-4 py-2 font-medium rounded-lg ${activeTab === 'apis' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                        onClick={() => setActiveTab('apis')}
                    >
                        🔌 API & Integrations
                    </button>
                    <button
                        className={`text-left px-4 py-2 font-medium rounded-lg ${activeTab === 'security' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                        onClick={() => setActiveTab('security')}
                    >
                        🔒 Security
                    </button>
                </div>

                {/* Settings Content Area */}
                <div className="flex-1 p-6">
                    {activeTab === 'general' && (
                        <div className="flex flex-col gap-5 max-w-2xl">
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">General App Data</h2>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Platform Name</label>
                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2" defaultValue="Bima Sakhi" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Support Email</label>
                                <input type="email" className="w-full border border-slate-300 rounded-lg p-2" defaultValue="support@bimasakhi.com" />
                            </div>
                            <button className="self-start bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">Save Changes</button>
                        </div>
                    )}

                    {activeTab === 'apis' && (
                        <div className="flex flex-col gap-5 max-w-2xl">
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">API Connections</h2>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Zoho CRM Refresh Token</label>
                                <input type="password" className="w-full border border-slate-300 rounded-lg p-2" defaultValue="***************" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">OpenAI API Key (For Ask-AI Assistant)</label>
                                <input type="password" className="w-full border border-slate-300 rounded-lg p-2" defaultValue="sk-****************" />
                            </div>
                            <button className="self-start bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">Update Keys</button>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="flex flex-col gap-5 max-w-2xl">
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Platform Security</h2>
                            <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
                                <div>
                                    <h4 className="font-semibold text-slate-800">Require 2FA for Super Admins</h4>
                                    <p className="text-sm text-slate-500">Enforce two-factor authentication on system login.</p>
                                </div>
                                <input type="checkbox" className="w-5 h-5" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
                                <div>
                                    <h4 className="font-semibold text-slate-800">Admin API Rate Limiting</h4>
                                    <p className="text-sm text-slate-500">Limit mutations to 60 req/min per IP address.</p>
                                </div>
                                <input type="checkbox" className="w-5 h-5" defaultChecked />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsContent;
