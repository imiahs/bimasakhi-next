import React from 'react';
import { supabase } from '@/lib/supabase';
import QStashTrigger from '@/components/admin/QStashTrigger';

export default async function LocationGeneratorAdmin() {
    const { count: cityCount } = await supabase.from('cities').select('id', { count: 'exact', head: true });
    const { count: locCount } = await supabase.from('localities').select('id', { count: 'exact', head: true });
    const { count: pinCount } = await supabase.from('pincodes').select('id', { count: 'exact', head: true });

    // Simulating recent data mapping tracking logs
    const { data: cities } = await supabase.from('cities').select('city_name, slug, population, active').order('population', { ascending: false }).limit(10);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-white">Location Database & Bulk Generator</h1>
            <p className="text-slate-400 text-sm">Manage the Geographic Database indexing hierarchies from City down to granular Pincodes.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="admin-panel rounded-xl p-5 text-center border-t-2 border-blue-500">
                    <div className="text-3xl font-bold text-white mb-1">{cityCount || 0}</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cities Indexed</div>
                </div>
                <div className="admin-panel rounded-xl p-5 text-center border-t-2 border-indigo-500">
                    <div className="text-3xl font-bold text-white mb-1">{locCount || 0}</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Localities Grouped</div>
                </div>
                <div className="admin-panel rounded-xl p-5 text-center border-t-2 border-purple-500">
                    <div className="text-3xl font-bold text-white mb-1">{pinCount || 0}</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pincodes Mapped</div>
                </div>
            </div>

            <div className="admin-panel rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4 border-b border-white/[0.06] pb-4">
                    <h2 className="text-lg font-bold text-white">Top Target Cities</h2>
                    <QStashTrigger 
                        label="+ Bulk Generate City Batch" 
                        cssClass="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition"
                        endpoint="/api/jobs/pagegen"
                    />
                </div>

                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                            <th className="p-3 text-slate-400 text-xs uppercase">City Node</th>
                            <th className="p-3 text-slate-400 text-xs uppercase">Slug Routing</th>
                            <th className="p-3 text-slate-400 text-xs uppercase">Population</th>
                            <th className="p-3 text-right text-slate-400 text-xs uppercase">Generate Targeting</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cities?.map(c => (
                            <tr key={c.slug} className="border-t border-white/[0.04] hover:bg-white/[0.03]">
                                <td className="p-3 font-semibold text-slate-200">{c.city_name}</td>
                                <td className="p-3 text-sm text-slate-500 font-mono">/bima-sakhi-{c.slug}</td>
                                <td className="p-3 text-sm text-slate-400">{c.population?.toLocaleString() || 'System Bound'}</td>
                                <td className="p-3 text-right">
                                    <button className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1 rounded bg-blue-50">
                                        Queue Downstream Pincodes
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
