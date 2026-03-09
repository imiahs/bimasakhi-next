'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function MotivationContent() {
    const [motivation, setMotivation] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Global Motivation
                const { data: motData } = await supabase
                    .from('agent_motivation')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (motData) setMotivation(motData);

                // Personal Notifications (Coaching / Renewals / Reminders from the Background Worker)
                const { data: notifData } = await supabase
                    .from('agent_notifications')
                    .select('*')
                    .eq('agent_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (notifData) setNotifications(notifData);

            } catch (error) {
                console.error("Motivation fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, []);

    const markRead = async (id) => {
        try {
            await supabase.from('agent_notifications').update({ is_read: true }).eq('id', id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) {
            console.error("Failed marking read", e);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Motivation Hub...</div>;

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
            <h1 className="text-3xl font-bold text-slate-900">Coaching & Motivation Hub</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Motivation Stream */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Daily Fuel</h2>
                    {motivation.length === 0 ? <p className="text-sm text-slate-500">No recent posts.</p> : motivation.map(mot => (
                        <div key={mot.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                            <span className="inline-block px-2 text-xs font-bold uppercase rounded bg-indigo-100 text-indigo-700 mb-2">
                                {mot.type.replace('_', ' ')}
                            </span>
                            <p className="text-slate-800 text-sm whitespace-pre-wrap">{mot.content}</p>
                            {mot.scheduled_for && <p className="text-xs text-slate-500 mt-3 border-t pt-2">Scheduled: {mot.scheduled_for}</p>}
                        </div>
                    ))}
                </div>

                {/* Direct Coaching & Alerts */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Your Personal Alerts</h2>
                    {notifications.length === 0 ? <p className="text-sm text-slate-500">All caught up! No recent alerts.</p> : notifications.map(notif => (
                        <div key={notif.id} className={`p-4 rounded-xl border ${notif.is_read ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${notif.is_read ? 'text-slate-500' : 'text-red-700'}`}>
                                        {notif.type.replace('_', ' ')}
                                    </span>
                                    <p className={`mt-1 text-sm ${notif.is_read ? 'text-slate-600' : 'text-red-900 font-medium'}`}>
                                        {notif.message}
                                    </p>
                                </div>
                                {!notif.is_read && (
                                    <button onClick={() => markRead(notif.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">
                                        Dismiss
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
