'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase'; // Automatically checks RLS token on client side.

export default function AgentBusinessContent() {
    const [activeTab, setActiveTab] = useState('prospects'); // prospects, policies, renewals
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTabData();
    }, [activeTab]);

    const fetchTabData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return; // Wait for login

            const tableName = activeTab === 'prospects' ? 'prospects'
                : activeTab === 'policies' ? 'policies'
                    : 'renewals';

            let query = supabase.from(tableName).select('*');

            if (tableName === 'renewals') {
                // For renewals, we also join policies to get customer names
                query = supabase.from('renewals').select('*, policies!inner(customer_name, agent_id)').eq('policies.agent_id', user.id).limit(100);
            } else {
                // Ensure large tables are capped
                query = query.eq('agent_id', user.id).order('created_at', { ascending: false }).limit(100);
            }

            // Using RLS, only this agent's data is returned.
            const { data, error } = await query;
            if (!error && data) {
                setDataList(data);
            }
        } catch (error) {
            console.error("Failed to fetch CRM data", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Business CRM</h1>

            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    {['prospects', 'policies', 'renewals'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading {activeTab}...</div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {activeTab === 'prospects' && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prospect Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mobile</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stage</th>
                                    </>
                                )}
                                {activeTab === 'policies' && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Premium (₹)</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    </>
                                )}
                                {activeTab === 'renewals' && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {dataList.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-slate-500">No {activeTab} found.</td>
                                </tr>
                            ) : (
                                dataList.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        {activeTab === 'prospects' && (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.mobile}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                                        {item.stage}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        {activeTab === 'policies' && (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.customer_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.policy_type}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">₹{item.premium_amount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${item.policy_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {item.policy_status}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        {activeTab === 'renewals' && (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.policies?.customer_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.renewal_due_date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
