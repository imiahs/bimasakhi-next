import React from 'react';
import { supabase } from '@/lib/supabase';

export default async function ContentQualityAdmin() {
    const { data: queue } = await supabase
        .from('content_review_queue')
        .select('*, page_index(page_slug)')
        .order('created_at', { ascending: false })
        .limit(50);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-white">AI Content Review Queue</h1>
            <p className="text-slate-400 text-sm">This isolated environment tracks generation endpoints explicitly violating uniqueness thresholds.</p>

            <div className="admin-panel rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="border-b border-white/[0.06] bg-white/[0.03]">
                        <tr>
                            <th className="p-4 text-xs text-slate-400 uppercase">Target Slug</th>
                            <th className="p-4 text-xs text-slate-400 uppercase">Flag Reason</th>
                            <th className="p-4 text-xs text-slate-400 uppercase">Status</th>
                            <th className="p-4 text-xs text-slate-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {queue?.map(q => (
                            <tr key={q.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                                <td className="p-4 font-mono text-sm text-slate-200">{q.page_index?.page_slug || 'Orphan Node'}</td>
                                <td className="p-4 text-sm text-slate-400">{q.reason}</td>
                                <td className="p-4 text-xs font-bold uppercase tracking-widest text-amber-400">{q.status}</td>
                                <td className="p-4">
                                    <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Audit Content</button>
                                </td>
                            </tr>
                        ))}
                        {(!queue || queue.length === 0) && (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-slate-500">No content violations mapped recently. Queue is empty.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
