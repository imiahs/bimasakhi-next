import React from 'react';
import { supabase } from '@/lib/supabase';

export default async function ContentQualityAdmin() {
    const { data: queue } = await supabase
        .from('content_review_queue')
        .select('*, page_index(page_slug)')
        .order('created_at', { ascending: false })
        .limit(50);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">AI Content Review Queue</h1>
            <p className="text-gray-600 mb-6">This isolated environment tracks generation endpoints explicitly violating uniqueness thresholds.</p>

            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-red-50 text-red-900 border-b border-red-100">
                        <tr>
                            <th className="p-4">Target Slug</th>
                            <th className="p-4">Flag Reason</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {queue?.map(q => (
                            <tr key={q.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-mono text-sm">{q.page_index?.page_slug || 'Orphan Node'}</td>
                                <td className="p-4 text-sm text-gray-600">{q.reason}</td>
                                <td className="p-4 text-xs font-bold uppercase tracking-widest text-orange-600">{q.status}</td>
                                <td className="p-4">
                                    <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Audit Content</button>
                                </td>
                            </tr>
                        ))}
                        {(!queue || queue.length === 0) && (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-500">No content violations mapped recently natively. Queue is empty.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
