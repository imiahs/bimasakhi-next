import React from 'react';
import { supabase } from '@/lib/supabase';

export default async function SystemAlerts() {
    // Surface raw execution errors tracked inside system_errors bypassing Vercel limits natively
    const { data: errors } = await supabase.from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-rose-400">Platform System Alerts</h1>
            <p className="text-slate-400 text-sm">Aggregated tracking of uncaught background worker exceptions or unhandled orchestration closures.</p>

            <div className="admin-panel rounded-2xl border border-rose-500/20">
                {errors?.length > 0 ? (
                    <table className="w-full text-left">
                        <thead className="border-b border-white/[0.06] bg-rose-500/5">
                            <tr>
                                <th className="p-4 text-xs text-slate-400 uppercase">Component</th>
                                <th className="p-4 text-xs text-slate-400 uppercase">Error Type</th>
                                <th className="p-4 text-xs text-slate-400 uppercase">Message</th>
                                <th className="p-4 text-xs text-slate-400 uppercase">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {errors.map(err => (
                                <tr key={err.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                                    <td className="p-4 font-mono text-xs text-slate-300">{err.component}</td>
                                    <td className="p-4 font-bold text-xs text-rose-400 uppercase">{err.error_type}</td>
                                    <td className="p-4 text-sm text-slate-300">{err.message}</td>
                                    <td className="p-4 text-xs text-slate-500">{new Date(err.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center">
                        <div className="text-emerald-400 text-4xl mb-2">✓</div>
                        <h2 className="text-xl font-bold text-white">Zero System Errors</h2>
                        <p className="text-slate-500">The platform is operating flawlessly.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
