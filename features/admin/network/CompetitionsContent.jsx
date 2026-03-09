'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function CompetitionsContent() {
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchComps = async () => {
            try {
                // DOs fetch all active/historical competitions
                const { data } = await supabase
                    .from('competitions')
                    .select('*')
                    .order('duration_start', { ascending: false });

                if (data) setCompetitions(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchComps();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">Checking active challenges...</div>;

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-900">Branch Competitions & Circulars</h1>
                <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 font-semibold rounded-lg shadow-sm transition">
                    + Launch Competition
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitions.length === 0 ? (
                    <p className="text-slate-500 col-span-3 text-center py-12">No active competitions found.</p>
                ) : (
                    competitions.map(comp => {
                        const isLive = new Date() >= new Date(comp.duration_start) && new Date() <= new Date(comp.duration_end);
                        return (
                            <div key={comp.id} className={`bg-white p-6 rounded-xl shadow-sm border ${isLive ? 'border-yellow-400 border-2' : 'border-slate-200'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${isLive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                        {isLive ? 'Live Now' : 'Ended'}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500 uppercase">{comp.level} Level</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{comp.criteria.replace('_', ' ')} Challenge</h3>
                                <div className="text-sm text-slate-600 mb-4 space-y-1">
                                    <p><strong>Starts:</strong> {new Date(comp.duration_start).toLocaleDateString()}</p>
                                    <p><strong>Ends:</strong> {new Date(comp.duration_end).toLocaleDateString()}</p>
                                    <p><strong>Type:</strong> <span className="capitalize">{comp.type.replace('_', ' ')}</span></p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <h4 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-1">Rewards</h4>
                                    <p className="text-sm text-slate-800 font-medium">{comp.rewards}</p>
                                </div>
                                <button className="mt-4 w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition">
                                    View Leaderboard
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
