'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase'; // Using client-side supabase with auth persistence
import Link from 'next/link';

export default function AgentDashboardContent() {
    const [metrics, setMetrics] = useState(null);
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [referralLink, setReferralLink] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // RLS automatically limits this down to the active user profile
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Fetch agent profile (RLS applied)
                const { data: profile } = await supabase
                    .from('agents')
                    .select('*')
                    .eq('agent_id', user.id)
                    .single();

                if (profile) {
                    setAgent(profile);
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    setReferralLink(`${origin}/apply?ref=${profile.ref_code}`);
                }

                // Fetch cached metrics (RLS applied - Agent reads own metrics)
                const { data: businessMetrics } = await supabase
                    .from('agent_business_metrics')
                    .select('*')
                    .eq('agent_id', user.id)
                    .single();

                // Fetch persistency
                const { data: persistency } = await supabase
                    .from('persistency_metrics')
                    .select('*')
                    .eq('agent_id', user.id)
                    .single();

                setMetrics({
                    business: businessMetrics || { total_policies: 0, monthly_sales: 0, team_size: 0, team_business: 0, target_progress: {} },
                    persistency: persistency || { total_policies: 0, renewal_ratio: 0 }
                });

            } catch (error) {
                console.error("Dashboard fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Dashboard Data...</div>;

    if (!agent) return <div className="p-8 text-center text-red-500">Agent session not found. Please log in first.</div>;

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Welcome, {agent.name}</h1>

            {/* Quick Actions & Referral Link */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Recruitment Pipeline</h3>
                <p className="text-sm text-slate-600 mb-4">Share this link to directly onboard candidates into your downline:</p>
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        readOnly
                        value={referralLink}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-600 font-mono text-sm"
                    />
                    <button
                        onClick={() => navigator.clipboard.writeText(referralLink)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition"
                    >
                        Copy Link
                    </button>
                    <Link href="/agent/recruitment-progress" className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium">View Pipeline →</Link>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Policies</h4>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.business.total_policies}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">M-T-D Sales (₹)</h4>
                    <p className="mt-2 text-3xl font-bold text-slate-900">₹{parseFloat(metrics.business.monthly_sales).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Team Size</h4>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.business.team_size}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Renewal Ratio</h4>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{parseFloat(metrics.persistency.renewal_ratio).toFixed(1)}%</p>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/agent/business" className="block bg-slate-800 text-white p-6 rounded-xl shadow hover:bg-slate-700 transition">
                    <h3 className="text-xl font-bold">CRM & Business</h3>
                    <p className="text-slate-300 mt-2 text-sm">Manage prospects, leads, and active policies.</p>
                </Link>
                <Link href="/agent/training" className="block bg-indigo-600 text-white p-6 rounded-xl shadow hover:bg-indigo-500 transition">
                    <h3 className="text-xl font-bold">Training Hub</h3>
                    <p className="text-indigo-200 mt-2 text-sm">Access videos, PDFs, and Mock IRDA tests.</p>
                </Link>
                <Link href="/agent/motivation" className="block bg-emerald-600 text-white p-6 rounded-xl shadow hover:bg-emerald-500 transition">
                    <h3 className="text-xl font-bold">Motivation & Growth</h3>
                    <p className="text-emerald-200 mt-2 text-sm">Daily tips, webinars, and scripts.</p>
                </Link>
            </div>
        </div>
    );
}
