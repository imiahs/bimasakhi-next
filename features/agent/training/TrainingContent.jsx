'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function TrainingContent() {
    const [modules, setModules] = useState([]);
    const [progress, setProgress] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTraining = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch Modules
                const { data: moduleData } = await supabase
                    .from('training_modules')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (moduleData) setModules(moduleData);

                // Fetch Progress
                const { data: progData } = await supabase
                    .from('training_progress')
                    .select('module_id, status')
                    .eq('agent_id', user.id);

                if (progData) {
                    const progMap = {};
                    progData.forEach(p => progMap[p.module_id] = p.status);
                    setProgress(progMap);
                }

            } catch (error) {
                console.error("Training fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTraining();
    }, []);

    const markComplete = async (moduleId) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('training_progress').upsert({
                agent_id: user.id,
                module_id: moduleId,
                status: 'completed',
                completed_at: new Date().toISOString()
            }, { onConflict: 'agent_id,module_id' });

            setProgress(prev => ({ ...prev, [moduleId]: 'completed' }));
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Training Modules...</div>;

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Training & Exam Hub</h1>
            <p className="text-slate-600">Access your LIC Agent preparation materials and take IRDA mock tests.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((mod) => (
                    <div key={mod.module_id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 uppercase">
                                    {mod.type.replace('_', ' ')}
                                </span>
                                {progress[mod.module_id] === 'completed' && (
                                    <span className="text-green-600 font-bold text-sm">✓ Completed</span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">{mod.title}</h3>
                            <p className="text-sm text-slate-500 mb-4">Topic: {mod.lic_syllabus_topic}</p>
                        </div>

                        <div className="flex gap-2 mt-4">
                            {mod.type === 'mock_test' ? (
                                <button className="flex-1 bg-slate-800 text-white py-2 rounded-md text-sm font-semibold hover:bg-slate-700 transition">
                                    Start Test
                                </button>
                            ) : (
                                <a href={mod.content_url} target="_blank" rel="noreferrer" className="flex-1 text-center bg-blue-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition">
                                    Open Material
                                </a>
                            )}
                            {progress[mod.module_id] !== 'completed' && (
                                <button onClick={() => markComplete(mod.module_id)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-200 transition">
                                    Mark Done
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
