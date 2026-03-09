'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const BLOCK_TYPES = ['HeroBlock', 'ContentBlock', 'BenefitsBlock', 'TestimonialBlock', 'CTABlock', 'FAQBlock', 'CalculatorBlock', 'DownloadBlock'];

const PageEditorContent = ({ pageId }) => {
    const router = useRouter();
    const [page, setPage] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);

    // Versioning State
    const [versions, setVersions] = useState([]);
    const [selectedVersionId, setSelectedVersionId] = useState('');

    useEffect(() => {
        const loadPage = async () => {
            try {
                const res = await fetch(`/api/admin/pages/${pageId}`);
                const data = await res.json();
                if (data.page) {
                    setPage(data.page);
                    setBlocks(data.blocks || []);
                    setVersions(data.versions || []);
                } else {
                    alert('Page not found');
                    router.push('/admin/pages');
                }
            } catch (error) {
                console.error('Failed to load page config', error);
            } finally {
                setLoading(false);
            }
        };
        if (pageId) loadPage();
    }, [pageId, router]);

    const handleSave = async (isRollback = false) => {
        setSaving(true);
        try {
            const payload = {
                ...page,
                blocks: blocks.map((b, idx) => ({ ...b, block_order: idx })),
                is_rollback: isRollback,
                rollback_version_id: isRollback ? selectedVersionId : null
            };

            const res = await fetch(`/api/admin/pages/${pageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message || 'Page blocks successfully synchronized and saved.');
                // Reload state to capture new versions if any
                const reloadRes = await fetch(`/api/admin/pages/${pageId}`);
                const reloadData = await reloadRes.json();
                if (reloadData.versions) setVersions(reloadData.versions);
                if (isRollback && reloadData.page) {
                    setPage(reloadData.page);
                    setBlocks(reloadData.blocks || []);
                    setSelectedVersionId('');
                }
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Failed to save to server.');
        } finally {
            setSaving(false);
        }
    };

    const handleRollback = async () => {
        if (!selectedVersionId) return alert('Select a version first');
        if (!confirm('Are you sure you want to rollback? This overwrites current content and creates a new version snapshot.')) return;
        await handleSave(true);
    };

    const handleAIGenerate = async () => {
        if (!confirm('This will replace your current unsaved canvas blocks with an AI-generated layout. Proceed?')) return;
        setGeneratingAI(true);
        try {
            const res = await fetch('/api/admin/ai/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: page.title, is_campaign_page: page.is_campaign_page })
            });
            const data = await res.json();
            if (data.success && data.blocks) {
                setBlocks(data.blocks);
            } else {
                alert('Generation failed: ' + data.error);
            }
        } catch (error) {
            alert('Failed to reach AI Core.');
        } finally {
            setGeneratingAI(false);
        }
    };

    const addBlock = (type) => {
        const newBlock = { id: crypto.randomUUID(), block_type: type, block_data: {} };
        setBlocks([...blocks, newBlock]);
    };

    const removeBlock = (index) => {
        const newArr = [...blocks];
        newArr.splice(index, 1);
        setBlocks(newArr);
    };

    const moveBlock = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === blocks.length - 1) return;

        const newArr = [...blocks];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newArr[index];
        newArr[index] = newArr[swapIndex];
        newArr[swapIndex] = temp;
        setBlocks(newArr);
    };

    const handleBlockDataChange = (index, key, value) => {
        const newArr = [...blocks];
        newArr[index].block_data = { ...newArr[index].block_data, [key]: value };
        setBlocks(newArr);
    };

    if (loading) return <div className="p-8 text-center">Loading Visual Editor...</div>;
    if (!page) return null;

    return (
        <div className="flex flex-col gap-6 h-full pb-10">
            {/* Header */}
            <div className="admin-page-header flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link href="/admin/pages" className="text-slate-500 hover:text-indigo-600 font-medium text-sm transition">← Back to Pages</Link>
                        <span className="text-slate-300">|</span>
                        <span className="text-xs uppercase font-bold text-slate-400">Editing Layout</span>
                    </div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {page.title}
                        {page.is_campaign_page && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded inline-block uppercase ml-2 tracking-wider">Campaign</span>}
                    </h1>
                    <p className="font-mono text-sm text-indigo-600 mt-1">/pages/{page.slug}</p>
                </div>
                <div className="flex gap-4 items-center">
                    {versions.length > 0 && (
                        <div className="flex bg-slate-50 border border-slate-200 rounded p-1 shadow-inner">
                            <select className="text-xs font-semibold text-slate-600 focus:outline-none bg-transparent px-2" value={selectedVersionId} onChange={e => setSelectedVersionId(e.target.value)}>
                                <option value="">-- View Versions --</option>
                                {versions.map(v => (
                                    <option key={v.id} value={v.id}>v{v.version_number} ({new Date(v.created_at).toLocaleString()})</option>
                                ))}
                            </select>
                            <button onClick={handleRollback} disabled={!selectedVersionId || saving} className="ml-2 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded transition font-bold disabled:opacity-50">
                                Rollback Route
                            </button>
                        </div>
                    )}
                    <Link href={`/pages/${page.slug}`} target="_blank" className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded font-medium text-sm transition text-center inline-block">Preview Page</Link>
                    <button onClick={() => handleSave(false)} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded font-medium shadow-sm transition disabled:bg-slate-400">
                        {saving ? 'Saving...' : 'Save & Publish Blocks'}
                    </button>
                </div>
            </div>

            {/* Layout Canvas & Block Pallete */}
            <div className="flex gap-6 items-start">

                {/* Block Canvas Main Column */}
                <div className="flex-grow w-2/3 flex flex-col gap-4">
                    {blocks.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-16 text-center text-slate-500">
                            <span className="text-5xl opacity-30 mb-4 inline-block">🧱</span>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Canvas is Empty</h3>
                            <p className="text-sm max-w-sm mx-auto">Click any component from the right sidebar to inject structural elements onto this page.</p>
                        </div>
                    ) : (
                        blocks.map((block, i) => (
                            <div key={block.id || i} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:border-indigo-300">
                                {/* Block Header Toolbar */}
                                <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-indigo-600 text-white font-mono text-xs px-2 py-0.5 rounded">{String(i + 1).padStart(2, '0')}</span>
                                        <h4 className="font-bold text-slate-800 tracking-wide">{block.block_type}</h4>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveBlock(i, 'up')} disabled={i === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">⬆️</button>
                                        <button onClick={() => moveBlock(i, 'down')} disabled={i === blocks.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">⬇️</button>
                                        <span className="text-slate-300">|</span>
                                        <button onClick={() => removeBlock(i)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete Block">🗑️</button>
                                    </div>
                                </div>

                                {/* Dynamic Block Input Forms */}
                                <div className="p-5 flex flex-col gap-4">
                                    {/* Dynamic Render based on block_type */}
                                    {block.block_type === 'HeroBlock' && (
                                        <>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Headline</label>
                                                <input type="text" value={block.block_data.headline || ''} onChange={e => handleBlockDataChange(i, 'headline', e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm" placeholder="Hero large text" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Subheadline / Paragraph</label>
                                                <textarea value={block.block_data.subheadline || ''} onChange={e => handleBlockDataChange(i, 'subheadline', e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm" rows={2} placeholder="Hero descriptive text" />
                                            </div>
                                        </>
                                    )}

                                    {block.block_type === 'ContentBlock' && (
                                        <>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">RTE Content Payload (HTML)</label>
                                                <textarea value={block.block_data.html || ''} onChange={e => handleBlockDataChange(i, 'html', e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm font-mono bg-slate-50" rows={5} placeholder="<p>Standard rich text structure</p>" />
                                            </div>
                                        </>
                                    )}

                                    {block.block_type === 'CTABlock' && (
                                        <>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Button Label</label>
                                                    <input type="text" value={block.block_data.label || ''} onChange={e => handleBlockDataChange(i, 'label', e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm" placeholder="e.g. Ready to start your journey?" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Target URL</label>
                                                    <input type="text" value={block.block_data.href || ''} onChange={e => handleBlockDataChange(i, 'href', e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm" placeholder="/apply" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Button Text</label>
                                                <input type="text" value={block.block_data.buttonText || ''} onChange={e => handleBlockDataChange(i, 'buttonText', e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm" placeholder="Apply Now" />
                                            </div>
                                        </>
                                    )}

                                    {block.block_type === 'TestimonialBlock' && (
                                        <>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Quote Text</label>
                                                <textarea value={block.block_data.quote || ''} onChange={e => handleBlockDataChange(i, 'quote', e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm" rows={2} placeholder="Testimonial text" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Author</label>
                                                <input type="text" value={block.block_data.author || ''} onChange={e => handleBlockDataChange(i, 'author', e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm" placeholder="e.g., Priya Sharma" />
                                            </div>
                                        </>
                                    )}

                                    {/* Generic fallback for complex structural components like Calculator that might not need explicit forms, but rely on component logic directly */}
                                    {['BenefitsBlock', 'FAQBlock', 'CalculatorBlock', 'DownloadBlock'].includes(block.block_type) && (
                                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded text-sm text-indigo-700 flex items-center gap-3">
                                            <span>⚡</span>
                                            <div>
                                                <div className="font-bold">Dynamic Macro Rendered Component</div>
                                                <p className="text-indigo-600 mt-1 opacity-80 text-xs">This block automatically queries the database or renders structural JS tools. No manual overrides configured at this level.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Simple configuration dump map */}
                                    <details className="mt-2 group">
                                        <summary className="text-xs text-slate-400 font-medium cursor-pointer hover:text-indigo-600 transition">Show Raw JSON State</summary>
                                        <pre className="text-xs bg-slate-900 text-slate-300 p-3 rounded mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
                                            {JSON.stringify(block.block_data, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Sidebar Tool Palette */}
                <div className="w-1/3 bg-white rounded-lg border border-slate-200 shadow-sm p-4 sticky top-28">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span>📦</span> Component Palette
                    </h3>

                    <div className="flex flex-col gap-2">
                        {BLOCK_TYPES.map(type => (
                            <button
                                key={type}
                                onClick={() => addBlock(type)}
                                className="text-left w-full p-3 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 rounded transition flex justify-between items-center group font-medium text-slate-600 text-sm"
                            >
                                <span>{type}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition text-indigo-500">+ Add</span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 border-t border-slate-100 pt-4">
                        <div className="bg-indigo-50 rounded-lg p-4">
                            <h4 className="font-bold text-indigo-900 text-sm mb-1">AI Assistant 🤖</h4>
                            <p className="text-xs text-indigo-700 mb-3">Not sure what to build? Let AI generate the page blocks natively assessing user traffic models.</p>
                            <button onClick={handleAIGenerate} disabled={generatingAI} className="w-full bg-white border border-indigo-200 py-1.5 rounded text-xs font-bold text-indigo-600 shadow-sm hover:bg-slate-50 transition disabled:opacity-50">
                                {generatingAI ? 'Synthesizing...' : 'Auto-Populate Page'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PageEditorContent;
