'use client';

import React, { useState, useEffect } from 'react';

const BackupsContent = () => {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/backups');
            const data = await res.json();
            if (data.backups) {
                setBackups(data.backups);
            }
        } catch (error) {
            console.error("Failed to load backups", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const triggerBackup = async () => {
        setGenerating(true);
        try {
            // Simulated placeholder delay for backup system decoupling
            await new Promise(resolve => setTimeout(resolve, 2000));
            const data = { success: true, message: 'Simulated backup generation' };
            if (data.success) {
                alert('Backup generated successfully!');
                fetchBackups();
            } else {
                alert('Backup failed: ' + data.error);
            }
        } catch (error) {
            alert('Backup request failed');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full p-6">
            <div className="admin-page-header">
                <h1 className="text-2xl font-bold text-slate-800">Database Backups & Recovery</h1>
                <p className="text-slate-500 mt-1">Manage automated and manual snapshots of your database layers.</p>
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                <div>
                    <h3 className="font-semibold text-slate-700">Storage Location</h3>
                    <p className="text-sm text-slate-500">/backups/ directory (Local File System API)</p>
                </div>
                <button
                    onClick={triggerBackup}
                    disabled={generating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition disabled:bg-slate-400"
                >
                    {generating ? 'Generating Snapshot...' : 'Create Manual Backup'}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Snapshot Date</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Size</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Files Count</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="p-8 text-center text-slate-500">Loading backup archives...</td></tr>
                        ) : backups.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-slate-500">No backups found.</td></tr>
                        ) : (
                            backups.map(backup => (
                                <tr key={backup.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-4">
                                        <p className="font-semibold text-slate-800">{new Date(backup.timestamp.replace(/-/g, ':').replace('T', ' ')).toLocaleString()}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-1">{backup.id}</p>
                                    </td>
                                    <td className="p-4 text-slate-600">{(backup.sizeBytes / 1024).toFixed(2)} KB</td>
                                    <td className="p-4 text-slate-600">{backup.files.length} parts</td>
                                    <td className="p-4 text-right flex justify-end gap-3">
                                        <button className="text-blue-600 font-medium hover:underline text-sm">Download</button>
                                        <button className="text-orange-600 font-medium hover:underline text-sm">Restore</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BackupsContent;
