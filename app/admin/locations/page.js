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
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Location Database & Bulk Generator</h1>
            <p className="text-gray-600 mb-8">Manage the Geographic Database indexing hierarchies from City down to granular Pincodes orchestrating bulk targeted generations locally.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white shadow p-6 rounded text-center border-t-4 border-blue-500">
                    <div className="text-4xl font-black text-blue-800 mb-2">{cityCount || 0}</div>
                    <div className="text-sm font-bold text-gray-500 uppercase">Cities Indexed</div>
                </div>
                <div className="bg-white shadow p-6 rounded text-center border-t-4 border-indigo-500">
                    <div className="text-4xl font-black text-indigo-800 mb-2">{locCount || 0}</div>
                    <div className="text-sm font-bold text-gray-500 uppercase">Localities Grouped</div>
                </div>
                <div className="bg-white shadow p-6 rounded text-center border-t-4 border-purple-500">
                    <div className="text-4xl font-black text-purple-800 mb-2">{pinCount || 0}</div>
                    <div className="text-sm font-bold text-gray-500 uppercase">Pincodes Mapped</div>
                </div>
            </div>

            <div className="bg-white rounded shadow p-6 mb-8">
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <h2 className="text-xl font-bold">Top Target Cities</h2>
                    <QStashTrigger 
                        label="+ Bulk Generate City Batch" 
                        cssClass="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition"
                        endpoint="/api/jobs/pagegen"
                    />
                </div>

                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-3">City Node</th>
                            <th className="p-3">Slug Routing</th>
                            <th className="p-3">Population</th>
                            <th className="p-3 text-right">Generate Targeting</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cities?.map(c => (
                            <tr key={c.slug} className="border-t hover:bg-gray-50">
                                <td className="p-3 font-semibold text-gray-800">{c.city_name}</td>
                                <td className="p-3 text-sm text-gray-500 font-mono">/bima-sakhi-{c.slug}</td>
                                <td className="p-3 text-sm text-gray-600">{c.population?.toLocaleString() || 'System Bound'}</td>
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
