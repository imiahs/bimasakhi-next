'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBlockDefinition, listBlockDefinitions, normalizeBlockData, normalizeBlockPayloadsForSave } from '@/lib/blocks/registry';

const BLOCK_TYPES = listBlockDefinitions();

function normalizeEditorBlocks(blocks) {
    return (blocks || []).map((block) => ({
        ...block,
        block_data: normalizeBlockData(block.block_type, block.block_data),
    }));
}

function getFieldValue(blockData, field) {
    const value = blockData?.[field.key];
    if (field.type === 'json') {
        if (typeof value === 'string') return value;
        return JSON.stringify(value || [], null, 2);
    }

    return value || '';
}

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
                    setBlocks(normalizeEditorBlocks(data.blocks || []));
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
            let normalizedBlocks;
            try {
                normalizedBlocks = normalizeBlockPayloadsForSave(blocks.map((block, idx) => ({ ...block, block_order: idx })));
            } catch (error) {
                alert(error.message || 'Block JSON is invalid. Fix the highlighted block payload before saving.');
                return;
            }

            const payload = {
                ...page,
                blocks: normalizedBlocks,
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
                if (reloadData.page) setPage(reloadData.page);
                if (reloadData.blocks) setBlocks(normalizeEditorBlocks(reloadData.blocks || []));
                if (reloadData.versions) setVersions(reloadData.versions);
                if (isRollback) {
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
                setBlocks(normalizeEditorBlocks(data.blocks));
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
        const newBlock = { id: crypto.randomUUID(), block_type: type, block_data: normalizeBlockData(type, {}) };
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

    const renderField = (block, index, field) => {
        const commonClassName = `w-full rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-sm text-slate-100 ${field.type === 'json' ? 'font-mono' : ''}`;
        const value = getFieldValue(block.block_data, field);

        if (field.type === 'textarea' || field.type === 'json') {
            return (
                <div key={field.key}>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{field.label}</label>
                    <textarea
                        value={value}
                        onChange={(event) => handleBlockDataChange(index, field.key, event.target.value)}
                        className={commonClassName}
                        rows={field.rows || 4}
                        placeholder={field.placeholder || ''}
                    />
                </div>
            );
        }

        if (field.type === 'select') {
            return (
                <div key={field.key}>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{field.label}</label>
                    <select
                        value={value}
                        onChange={(event) => handleBlockDataChange(index, field.key, event.target.value)}
                        className={commonClassName}
                    >
                        {(field.options || []).map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            );
        }

        return (
            <div key={field.key}>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{field.label}</label>
                <input
                    type="text"
                    value={value}
                    onChange={(event) => handleBlockDataChange(index, field.key, event.target.value)}
                    className={commonClassName}
                    placeholder={field.placeholder || ''}
                />
            </div>
        );
    };

    const renderBlockInputs = (block, index) => {
        const definition = getBlockDefinition(block.block_type);

        if (!definition) {
            return (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                    No canonical registry contract is currently defined for this block type. Raw JSON remains visible below.
                </div>
            );
        }

        if (definition.editorMode === 'read-only') {
            return (
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-200">
                    This block is intentionally read-only at the structured editor level. Runtime-owned behavior stays bounded while title/subtitle remain configurable.
                </div>
            );
        }

        return definition.fields.map((field) => renderField(block, index, field));
    };

    if (loading) return <div className="admin-panel rounded-2xl p-8 text-center text-slate-300">Loading Visual Editor...</div>;
    if (!page) return null;

    return (
        <div className="flex h-full flex-col gap-6 pb-10 text-slate-200">
            {/* Header */}
            <div className="admin-page-header admin-panel sticky top-0 z-10 flex items-center justify-between rounded-2xl p-5">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link href="/admin/pages" className="text-sm font-medium text-slate-400 transition hover:text-white">← Back to Pages</Link>
                        <span className="text-slate-600">|</span>
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Editing Layout</span>
                    </div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
                        {page.title}
                        {page.is_campaign_page && <span className="ml-2 inline-block rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs uppercase tracking-wider text-amber-300">Campaign</span>}
                    </h1>
                    <p className="mt-1 font-mono text-sm text-emerald-300">/pages/{page.slug}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1">
                            parent_id: {page.parent_id || 'none'}
                        </span>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1">
                            full_slug: {page.full_slug || page.slug || '--'}
                        </span>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1">
                            page_type: {page.page_type || (page.is_campaign_page ? 'campaign_page' : 'custom_page')}
                        </span>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    {versions.length > 0 && (
                        <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                            <select className="bg-transparent px-2 text-xs font-semibold text-slate-300 focus:outline-none" value={selectedVersionId} onChange={e => setSelectedVersionId(e.target.value)}>
                                <option value="">-- View Versions --</option>
                                {versions.map(v => (
                                    <option key={v.id} value={v.id}>v{v.version_number} ({new Date(v.created_at).toLocaleString()})</option>
                                ))}
                            </select>
                            <button onClick={handleRollback} disabled={!selectedVersionId || saving} className="ml-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50">
                                Rollback Route
                            </button>
                        </div>
                    )}
                    <Link href={`/pages/${page.slug}`} target="_blank" className="admin-button-secondary inline-block px-4 py-2 text-center text-sm font-medium">Preview Page</Link>
                    <button onClick={() => handleSave(false)} disabled={saving} className="admin-button-primary px-6 py-2 text-sm font-medium disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save & Publish Blocks'}
                    </button>
                </div>
            </div>

            {/* Layout Canvas & Block Pallete */}
            <div className="flex items-start gap-6">

                {/* Block Canvas Main Column */}
                <div className="flex-grow w-2/3 flex flex-col gap-4">
                    {blocks.length === 0 ? (
                        <div className="admin-panel rounded-2xl border border-dashed border-white/[0.12] p-16 text-center text-slate-500">
                            <span className="text-5xl opacity-30 mb-4 inline-block">🧱</span>
                            <h3 className="mb-2 text-lg font-bold text-white">Canvas is Empty</h3>
                            <p className="text-sm max-w-sm mx-auto">Click any component from the right sidebar to inject structural elements onto this page.</p>
                        </div>
                    ) : (
                        blocks.map((block, i) => (
                            <div key={block.id || i} className="admin-panel flex flex-col overflow-hidden rounded-2xl transition-all hover:border-emerald-500/30">
                                {(() => {
                                    const blockDefinition = getBlockDefinition(block.block_type);

                                    return (
                                        <>
                                {/* Block Header Toolbar */}
                                <div className="group flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] p-3">
                                    <div className="flex items-center gap-3">
                                        <span className="rounded bg-emerald-500/80 px-2 py-0.5 font-mono text-xs text-slate-950">{String(i + 1).padStart(2, '0')}</span>
                                        <div>
                                            <h4 className="font-bold tracking-wide text-white">{blockDefinition?.displayName || block.block_type}</h4>
                                            {blockDefinition ? (
                                                <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                                    <span>{blockDefinition.classification}</span>
                                                    <span>{blockDefinition.durability}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveBlock(i, 'up')} disabled={i === 0} className="rounded p-1 hover:bg-white/[0.08] disabled:opacity-30">⬆️</button>
                                        <button onClick={() => moveBlock(i, 'down')} disabled={i === blocks.length - 1} className="rounded p-1 hover:bg-white/[0.08] disabled:opacity-30">⬇️</button>
                                        <span className="text-slate-600">|</span>
                                        <button onClick={() => removeBlock(i)} className="rounded p-1 text-rose-400 hover:bg-rose-500/10" title="Delete Block">🗑️</button>
                                    </div>
                                </div>

                                {/* Dynamic Block Input Forms */}
                                <div className="p-5 flex flex-col gap-4">
                                    <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                        {(blockDefinition?.surfaces || []).map((surface) => (
                                            <span key={surface} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1">{surface}</span>
                                        ))}
                                    </div>

                                    {renderBlockInputs(block, i)}

                                    {/* Simple configuration dump map */}
                                    <details className="mt-2 group">
                                        <summary className="cursor-pointer text-xs font-medium text-slate-400 transition hover:text-white">Show Raw JSON State</summary>
                                        <pre className="text-xs bg-slate-900 text-slate-300 p-3 rounded mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
                                            {JSON.stringify(block.block_data, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                                        </>
                                    );
                                })()}
                            </div>
                        ))
                    )}
                </div>

                {/* Right Sidebar Tool Palette */}
                <div className="admin-panel sticky top-28 w-1/3 rounded-2xl p-4">
                    <h3 className="mb-4 flex items-center gap-2 font-bold text-white">
                        <span>📦</span> Component Palette
                    </h3>

                    <div className="flex flex-col gap-2">
                        {BLOCK_TYPES.map((definition) => (
                            <button
                                key={definition.blockType}
                                onClick={() => addBlock(definition.blockType)}
                                className="group flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-left text-sm font-medium text-slate-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white"
                            >
                                <div>
                                    <div>{definition.displayName}</div>
                                    <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">{definition.classification}</div>
                                </div>
                                <span className="text-emerald-300 opacity-0 transition group-hover:opacity-100">+ Add</span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 border-t border-white/[0.06] pt-4">
                        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
                            <h4 className="mb-1 text-sm font-bold text-sky-100">AI Assistant 🤖</h4>
                            <p className="mb-3 text-xs text-sky-100/80">Not sure what to build? Let AI generate the page blocks natively assessing user traffic models.</p>
                            <button onClick={handleAIGenerate} disabled={generatingAI} className="w-full rounded-lg border border-sky-400/30 bg-white/[0.04] py-1.5 text-xs font-bold text-sky-100 transition hover:bg-white/[0.08] disabled:opacity-50">
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
