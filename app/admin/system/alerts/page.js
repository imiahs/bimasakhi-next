import React from 'react';
import { supabase } from '@/lib/supabase';

export default async function SystemAlerts() {
    // Surface raw execution errors tracked inside system_errors bypassing Vercel limits natively
    const { data: errors } = await supabase.from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-red-800">Platform System Alerts</h1>
            <p className="text-gray-600 mb-6">Aggregated tracking of uncaught background worker exceptions or unhandled orchestration closures natively avoiding Vercel payload constraints.</p>

            <div className="bg-white rounded shadow border border-red-200">
                {errors?.length > 0 ? (
                    <table className="w-full text-left bg-white">
                        <thead className="bg-red-50 text-red-900 border-b">
                            <tr>
                                <th className="p-4 text-sm">Component</th>
                                <th className="p-4 text-sm">Error Type</th>
                                <th className="p-4 text-sm">Message</th>
                                <th className="p-4 text-sm">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {errors.map(err => (
                                <tr key={err.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-mono text-xs text-gray-700">{err.component}</td>
                                    <td className="p-4 font-bold text-xs text-red-600 uppercase">{err.error_type}</td>
                                    <td className="p-4 text-sm">{err.message}</td>
                                    <td className="p-4 text-xs text-gray-500">{new Date(err.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center">
                        <div className="text-green-500 text-4xl mb-2">✓</div>
                        <h2 className="text-xl font-bold text-gray-700">Zero System Errors</h2>
                        <p className="text-gray-500">The platform is operating flawlessly mapping variables gracefully.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
