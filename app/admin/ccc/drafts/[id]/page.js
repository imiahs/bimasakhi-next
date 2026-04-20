'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StatusBadge from '@/components/admin/ui/StatusBadge';

export default function CCCDraftEditor() {
    const { id } = useParams();
    const router = useRouter();
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [rejectNotes, setRejectNotes] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Editable fields
    const [edits, setEdits] = useState({});

    const fetchDraft = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/ccc/drafts/${id}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setDraft(data.draft);
            setEdits({});
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchDraft(); }, [fetchDraft]);

    const getField = (field) => edits[field] !== undefined ? edits[field] : (draft?.[field] || '');
    const setField = (field, value) => setEdits(prev => ({ ...prev, [field]: value }));
    const hasEdits = Object.keys(edits).length > 0;

    const copyToClipboard = async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedPrompt(key);
            setTimeout(() => setCopiedPrompt(null), 2000);
        } catch { /* clipboard not available */ }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Upload failed');
            // Stage 1a fix (C5): data.file.file_url is the correct field from upload API response
            const imageUrl = data.file?.file_url;
            if (!imageUrl) throw new Error('Upload succeeded but no URL returned from server');
            // Save featured_image_url to draft
            const saveRes = await fetch(`/api/admin/ccc/drafts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featured_image_url: imageUrl })
            });
            const saveData = await saveRes.json();
            if (!saveData.success) throw new Error(saveData.error);
            setSuccess('Image uploaded and saved');
            await fetchDraft();
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const saveEdits = async () => {
        if (!hasEdits) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`/api/admin/ccc/drafts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(edits)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setSuccess('Changes saved');
            await fetchDraft();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAction = async (action, extraFields = {}) => {
        setActionLoading(action);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`/api/admin/ccc/drafts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extraFields })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setSuccess(data.message);
            setShowRejectModal(false);
            await fetchDraft();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-96 animate-pulse rounded-2xl bg-white/[0.03]" />
            </div>
        );
    }

    if (!draft) {
        return (
            <div className="text-center py-20">
                <p className="text-rose-400 text-lg font-medium">Draft not found</p>
                <button onClick={() => router.push('/admin/ccc/drafts')} className="mt-4 text-sm text-slate-400 hover:text-white">
                    ← Back to drafts
                </button>
            </div>
        );
    }

    const isEditable = draft.status === 'draft' || draft.status === 'review';
    const canApprove = draft.status === 'draft' || draft.status === 'review';
    const canReject = draft.status === 'draft' || draft.status === 'review';
    const canUnpublish = draft.status === 'published' || draft.status === 'approved';
    const canArchive = draft.status !== 'archived';
    const canSchedule = draft.status === 'draft' || draft.status === 'review';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/admin/ccc/drafts')} className="text-slate-400 hover:text-white text-sm">← Back</button>
                    <div>
                        <h1 className="text-xl font-bold text-white truncate max-w-lg">{draft.hero_headline || draft.slug}</h1>
                        <p className="text-xs text-slate-500 font-mono mt-1">/{draft.slug}</p>
                    </div>
                    <StatusBadge status={draft.status} size="md" />
                    {draft.scheduled_publish_at && (
                        <span className="text-[10px] px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                            Scheduled: {new Date(draft.scheduled_publish_at).toLocaleString('en-IN')}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {hasEdits && isEditable && (
                        <button
                            onClick={saveEdits}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
                    {canSchedule && (
                        <button
                            onClick={() => setShowScheduleModal(true)}
                            disabled={!!actionLoading}
                            className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                        >
                            ⏰ Schedule
                        </button>
                    )}
                    {canReject && (
                        <button
                            onClick={() => setShowRejectModal(true)}
                            disabled={!!actionLoading}
                            className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-medium hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                        >
                            Reject
                        </button>
                    )}
                    {canUnpublish && (
                        <button
                            onClick={() => handleAction('unpublish')}
                            disabled={!!actionLoading}
                            className="px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-sm font-medium hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                        >
                            {actionLoading === 'unpublish' ? 'Unpublishing...' : '⏸ Unpublish'}
                        </button>
                    )}
                    {canArchive && (
                        <button
                            onClick={() => handleAction('archive')}
                            disabled={!!actionLoading}
                            className="px-4 py-2 bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-lg text-sm font-medium hover:bg-slate-500/30 transition-colors disabled:opacity-50"
                        >
                            {actionLoading === 'archive' ? 'Archiving...' : '📦 Archive'}
                        </button>
                    )}
                    {canApprove && (
                        <button
                            onClick={() => handleAction('approve')}
                            disabled={!!actionLoading}
                            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                        >
                            {actionLoading === 'approve' ? 'Publishing...' : '✓ Approve & Publish'}
                        </button>
                    )}
                </div>
            </div>

            {/* Status Messages */}
            {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">{error}</div>}
            {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">{success}</div>}

            {/* Three-Panel Layout */}
            <div className="grid lg:grid-cols-[280px_1fr_280px] gap-6">

                {/* Left Panel — Metadata */}
                <div className="space-y-4">
                    <div className="admin-panel rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">SEO Metadata</h3>

                        <label className="block">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">Meta Title</span>
                            <input
                                type="text"
                                value={getField('meta_title')}
                                onChange={(e) => setField('meta_title', e.target.value)}
                                disabled={!isEditable}
                                className="w-full mt-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/40 disabled:opacity-50"
                            />
                            <span className={`text-[10px] mt-1 block ${getField('meta_title').length > 60 ? 'text-rose-400' : 'text-slate-500'}`}>
                                {getField('meta_title').length}/60
                            </span>
                        </label>

                        <label className="block">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">Meta Description</span>
                            <textarea
                                value={getField('meta_description')}
                                onChange={(e) => setField('meta_description', e.target.value)}
                                disabled={!isEditable}
                                rows={3}
                                className="w-full mt-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/40 disabled:opacity-50 resize-none"
                            />
                            <span className={`text-[10px] mt-1 block ${getField('meta_description').length > 160 ? 'text-rose-400' : 'text-slate-500'}`}>
                                {getField('meta_description').length}/160
                            </span>
                        </label>

                        <label className="block">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">CTA Text</span>
                            <input
                                type="text"
                                value={getField('cta_text')}
                                onChange={(e) => setField('cta_text', e.target.value)}
                                disabled={!isEditable}
                                className="w-full mt-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/40 disabled:opacity-50"
                            />
                        </label>
                    </div>

                    <div className="admin-panel rounded-2xl p-5 space-y-3">
                        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Info</h3>
                        <InfoRow label="Words" value={draft.word_count} />
                        <InfoRow label="Quality" value={draft.quality_score != null ? `${draft.quality_score}/10` : '--'} />
                        <InfoRow label="Gen Time" value={draft.generation_time_ms != null ? `${(draft.generation_time_ms / 1000).toFixed(1)}s` : '--'} />
                        <InfoRow label="AI Model" value={draft.ai_model || 'Unknown'} />
                        <InfoRow label="Created" value={draft.created_at ? new Date(draft.created_at).toLocaleString('en-IN') : '--'} />
                        {draft.reviewed_at && <InfoRow label="Reviewed" value={new Date(draft.reviewed_at).toLocaleString('en-IN')} />}
                        {draft.reviewer && <InfoRow label="Reviewer" value={draft.reviewer} />}
                        {draft.review_notes && (
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-slate-500">Review Notes</span>
                                <p className="text-xs text-amber-400 mt-1">{draft.review_notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center Panel — Content */}
                <div className="space-y-4">
                    <div className="admin-panel rounded-2xl p-5">
                        <label className="block mb-4">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">Hero Headline (H1)</span>
                            <input
                                type="text"
                                value={getField('hero_headline')}
                                onChange={(e) => setField('hero_headline', e.target.value)}
                                disabled={!isEditable}
                                className="w-full mt-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-lg font-semibold text-white focus:outline-none focus:border-emerald-500/40 disabled:opacity-50"
                            />
                        </label>

                        <label className="block">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">Body Content</span>
                            <textarea
                                value={getField('body_content')}
                                onChange={(e) => setField('body_content', e.target.value)}
                                disabled={!isEditable}
                                rows={20}
                                className="w-full mt-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/40 disabled:opacity-50 resize-y font-mono leading-relaxed"
                            />
                        </label>
                    </div>
                </div>

                {/* Right Panel — Preview & FAQ */}
                <div className="space-y-4">
                    <div className="admin-panel rounded-2xl p-5">
                        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Live Preview</h3>
                        <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-4">
                            <p className="text-emerald-400 text-[10px] font-mono mb-1">bimasakhi.com/{draft.slug}</p>
                            <p className="text-blue-400 text-sm font-medium truncate">{getField('meta_title') || draft.slug}</p>
                            <p className="text-slate-400 text-xs mt-1 line-clamp-2">{getField('meta_description')}</p>
                        </div>
                    </div>

                    {draft.faq_data && Array.isArray(draft.faq_data) && draft.faq_data.length > 0 && (
                        <div className="admin-panel rounded-2xl p-5">
                            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                                FAQ ({draft.faq_data.length})
                            </h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {draft.faq_data.map((faq, i) => (
                                    <div key={i} className="border-b border-white/[0.04] pb-2 last:border-0">
                                        <p className="text-xs font-medium text-slate-200">{faq.question || faq.name || `Q${i + 1}`}</p>
                                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                            {typeof faq.answer === 'string' ? faq.answer : (faq.acceptedAnswer?.text || faq.text || '')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(draft.status === 'approved' || draft.status === 'published') && (
                        <a
                            href={`/${draft.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center px-4 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                        >
                            View Live Page ↗
                        </a>
                    )}

                    {/* Phase 3: Image Intelligence */}
                    {draft.image_prompts && Object.keys(draft.image_prompts).length > 0 && (
                        <div className="admin-panel rounded-2xl p-5">
                            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">🎨 Image Intelligence</h3>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                {['hero', 'thumbnail', 'og'].map((imageType) => {
                                    const prompts = draft.image_prompts[imageType];
                                    if (!prompts) return null;
                                    const typeLabels = { hero: 'Hero (1200×500)', thumbnail: 'Thumbnail (400×400)', og: 'OG Image (1200×630)' };
                                    return (
                                        <div key={imageType}>
                                            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-2">{typeLabels[imageType]}</p>
                                            <div className="space-y-2">
                                                {['canva', 'adobe', 'imagen'].map((platform) => {
                                                    const prompt = prompts[platform];
                                                    if (!prompt) return null;
                                                    const key = `${imageType}-${platform}`;
                                                    const platformLabels = { canva: 'Canva', adobe: 'Adobe Firefly', imagen: 'Google Imagen' };
                                                    return (
                                                        <div key={key} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[10px] font-medium text-slate-400">{platformLabels[platform]}</span>
                                                                <button
                                                                    onClick={() => copyToClipboard(prompt, key)}
                                                                    className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.1] transition-colors"
                                                                >
                                                                    {copiedPrompt === key ? '✓ Copied' : 'Copy'}
                                                                </button>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3">{prompt}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Phase 3: Featured Image Upload */}
                    <div className="admin-panel rounded-2xl p-5">
                        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Featured Image</h3>
                        {draft.featured_image_url ? (
                            <div className="space-y-2">
                                <img src={draft.featured_image_url} alt={getField('featured_image_alt') || draft.hero_headline || 'Featured image'} className="w-full rounded-lg border border-white/[0.08]" />
                                <p className="text-[10px] text-slate-500 font-mono truncate">{draft.featured_image_url}</p>
                            </div>
                        ) : (
                            <p className="text-[11px] text-slate-500 mb-2">No image uploaded yet</p>
                        )}
                        {/* Fix 1c: Alt text field for SEO and accessibility */}
                        <label className="block mt-2">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">Alt Text (SEO)</span>
                            <input
                                type="text"
                                value={getField('featured_image_alt')}
                                onChange={(e) => setField('featured_image_alt', e.target.value)}
                                disabled={!isEditable}
                                placeholder="Describe the image for SEO and accessibility"
                                className="w-full mt-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/40 disabled:opacity-50"
                            />
                        </label>
                        {isEditable && (
                            <label className="mt-2 block">
                                <span className="sr-only">Upload featured image</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="block w-full text-[11px] text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-medium file:bg-white/[0.06] file:text-slate-300 hover:file:bg-white/[0.1] disabled:opacity-50 mt-2"
                                />
                                {uploading && <p className="text-[10px] text-amber-400 mt-1">Uploading...</p>}
                            </label>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="admin-panel rounded-2xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-semibold text-white">Reject Draft</h3>
                        <p className="text-sm text-slate-400">Add notes explaining why this content is being rejected.</p>
                        <textarea
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder="Rejection reason..."
                            rows={4}
                            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500/40 resize-none"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction('reject', { review_notes: rejectNotes })}
                                disabled={!!actionLoading}
                                className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-medium hover:bg-rose-500/30 disabled:opacity-50"
                            >
                                {actionLoading === 'reject' ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Publish Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="admin-panel rounded-2xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-semibold text-white">Schedule Publishing</h3>
                        <p className="text-sm text-slate-400">Choose when this draft should go live automatically.</p>
                        <input
                            type="datetime-local"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/40"
                        />
                        {draft.scheduled_publish_at && (
                            <p className="text-[11px] text-amber-400">
                                Currently scheduled: {new Date(draft.scheduled_publish_at).toLocaleString('en-IN')}
                            </p>
                        )}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowScheduleModal(false); setScheduleDate(''); }}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!scheduleDate) return;
                                    handleAction('schedule', { scheduled_publish_at: new Date(scheduleDate).toISOString() });
                                    setShowScheduleModal(false);
                                    setScheduleDate('');
                                }}
                                disabled={!scheduleDate || !!actionLoading}
                                className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50"
                            >
                                {actionLoading === 'schedule' ? 'Scheduling...' : 'Confirm Schedule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
            <span className="text-xs text-slate-300">{value}</span>
        </div>
    );
}
