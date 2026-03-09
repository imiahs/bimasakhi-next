'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function LeaderboardContent() {
    const [topAgents, setTopAgents] = useState([]);
    const [topTeams, setTopTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboards = async () => {
            try {
                // Fetch top agents by personal monthly sales
                const { data: agentsData } = await supabase
                    .from('agent_business_metrics')
                    .select('agent_id, monthly_sales, total_policies, agents!inner(name, city)')
                    .order('monthly_sales', { ascending: false })
                    .limit(10);

                if (agentsData) setTopAgents(agentsData);

                // Fetch top team leaders by team business
                const { data: teamsData } = await supabase
                    .from('agent_business_metrics')
                    .select('agent_id, team_business, team_size, agents!inner(name, city)')
                    .order('team_business', { ascending: false })
                    .limit(10);

                if (teamsData) setTopTeams(teamsData);

            } catch (error) {
                console.error("Leaderboard fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboards();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">Compiling Leaderboards...</div>;

    return (
        <div className="max-w-7xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Performance Leaderboards</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Independent Producers */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-lg font-bold text-slate-800">Top Producers (Individual)</h2>
                    </div>
                    <ul className="divide-y divide-slate-200">
                        {topAgents.map((agent, i) => (
                            <li key={agent.agent_id} className="p-6 flex items-center justify-between hover:bg-slate-50">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                        #{i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{agent.agents.name}</p>
                                        <p className="text-sm text-slate-500">{agent.agents.city} • {agent.total_policies} Policies</p>
                                    </div>
                                </div>
                                <div className="text-right items-end">
                                    <p className="text-lg font-bold text-green-600">₹{parseFloat(agent.monthly_sales).toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 font-medium">MTD Premium</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Top Teams (Development/Branch) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-lg font-bold text-slate-800">Top Performing Teams</h2>
                    </div>
                    <ul className="divide-y divide-slate-200">
                        {topTeams.map((team, i) => (
                            <li key={team.agent_id} className="p-6 flex items-center justify-between hover:bg-slate-50">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                        #{i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{team.agents.name}'s Team</p>
                                        <p className="text-sm text-slate-500">{team.team_size} Agents</p>
                                    </div>
                                </div>
                                <div className="text-right items-end">
                                    <p className="text-lg font-bold text-blue-600">₹{parseFloat(team.team_business).toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 font-medium">Team Premium</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
