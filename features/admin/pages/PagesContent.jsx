'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const PagesContent = () => {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [isCampaign, setIsCampaign] = useState(false);

    const loadPages = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/pages');
            const data = await res.json();
            if (data.pages) setPages(data.pages);
        } catch (error) {
            console.error('Fetch pages failed', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPages();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle, slug: newSlug, is_campaign_page: isCampaign })
            });
            const data = await res.json();
            if (data.success) {
                setNewTitle('');
                setNewSlug('');
                setIsCampaign(false);
                setIsCreating(false);
                loadPages();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Creation failed');
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full pb-10">
            <div className="admin-page-header flex justify-between items-center">
                <div>
                    <h1>Visual Pages & Campaigns</h1>
                    <p>Build and optimize block-based landing pages natively.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm"
                >
                    + Create New Page
                </button>
            </div>

            {isCreating && (
                <div className="bg-white border border-indigo-200 p-6 rounded-xl shadow-sm mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Draft New Page</h3>
                    <form onSubmit={handleCreate} className="flex flex-col gap-4 max-w-lg">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Page Title</label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="E.g., Bima Sakhi Recruitment Gurugram"
                                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">URL Slug</label>
                            <div className="flex items-center">
                                <span className="bg-slate-100 text-slate-500 border border-slate-300 border-r-0 px-3 py-2 rounded-l text-sm">/pages/</span>
                                <input
                                    type="text"
                                    value={newSlug}
                                    onChange={(e) => setNewSlug(e.target.value)}
                                    placeholder="bima-sakhi-gurugram"
                                    className="w-full border border-slate-300 rounded-r px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                id="campaign"
                                checked={isCampaign}
                                onChange={(e) => setIsCampaign(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="campaign" className="text-sm font-medium text-slate-700">Flag as Campaign Landing Page</label>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded font-semibold text-sm">Create Database Entry</button>
                            <button type="button" onClick={() => setIsCreating(false)} className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 rounded font-semibold text-sm">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Page Title</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">URL Status</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Updated</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center p-8 text-slate-500">Loading custom pages...</td></tr>
                        ) : pages.length > 0 ? (
                            pages.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-semibold text-slate-800">{p.title}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-xs text-indigo-600">/pages/{p.slug}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs inline-flex w-max font-bold uppercase ${p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {p.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {p.is_campaign_page ?
                                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold uppercase">Campaign</span> :
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">Standard</span>
                                        }
                                    </td>
                                    <td className="p-4 text-sm text-slate-500">{new Date(p.updated_at).toLocaleString()}</td>
                                    <td className="p-4 text-right">
                                        <Link href={`/admin/pages/${p.id}`} className="bg-white border border-slate-300 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 px-3 py-1.5 rounded font-medium text-xs transition shadow-sm">
                                            Edit Blocks
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} className="text-center p-8 text-slate-500">No pages mapped. Generate your first visual page.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PagesContent;
