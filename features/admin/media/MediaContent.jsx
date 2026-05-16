'use client';

import React, { useEffect, useMemo, useState } from 'react';
import './Media.css';

function normalizeFolderPath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .split('/')
        .map((segment) => segment.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
        .filter(Boolean)
        .join('/');
}

const MediaContent = () => {
    const [mediaItems, setMediaItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFolder, setSelectedFolder] = useState('all');
    const [uploadFolder, setUploadFolder] = useState('');
    const [altTextDrafts, setAltTextDrafts] = useState({});
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        fetchMedia();
    }, []);

    useEffect(() => {
        if (!notice) return undefined;

        const timeoutId = window.setTimeout(() => setNotice(null), 3000);
        return () => window.clearTimeout(timeoutId);
    }, [notice]);

    useEffect(() => {
        if (selectedFolder === 'all') return;

        const folderExists = mediaItems.some((item) => (item.folder || 'root') === selectedFolder);
        if (!folderExists) {
            setSelectedFolder('all');
        }
    }, [mediaItems, selectedFolder]);

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/media');
            const data = await res.json();
            if (data.media) {
                setMediaItems(data.media);
                setAltTextDrafts(
                    data.media.reduce((accumulator, item) => {
                        accumulator[item.id] = item.alt_text || '';
                        return accumulator;
                    }, {})
                );
            }
        } catch (error) {
            console.error('Failed to fetch media', error);
            setNotice({ tone: 'error', text: 'Failed to load media library.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            const normalizedFolder = normalizeFolderPath(uploadFolder);
            formData.append('file', file);

            if (normalizedFolder) {
                formData.append('folder', normalizedFolder);
            }

            const res = await fetch('/api/admin/media/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                await fetchMedia();
                if (normalizedFolder) {
                    setSelectedFolder(normalizedFolder);
                }
                setUploadFolder('');
                setNotice({ tone: 'success', text: 'Image uploaded and added to the library.' });
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error', error);
            setNotice({ tone: 'error', text: error.message || 'An upload error occurred.' });
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleCopy = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            setNotice({ tone: 'success', text: 'Media URL copied to clipboard.' });
        } catch (error) {
            console.error('Clipboard copy failed', error);
            setNotice({ tone: 'error', text: 'Failed to copy media URL.' });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this media record?')) return;
        try {
            const res = await fetch(`/api/admin/media?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to delete media');
            }

            await fetchMedia();
            setNotice({ tone: 'success', text: 'Media asset deleted.' });
        } catch (error) {
            console.error('Delete failed', error);
            setNotice({ tone: 'error', text: error.message || 'Delete failed.' });
        }
    };

    const handleAltTextChange = (id, value) => {
        setAltTextDrafts((current) => ({
            ...current,
            [id]: value,
        }));
    };

    const handleAltTextReset = (item) => {
        setAltTextDrafts((current) => ({
            ...current,
            [item.id]: item.alt_text || '',
        }));
    };

    const handleAltTextSave = async (item) => {
        const nextAltText = String(altTextDrafts[item.id] || '').trim();

        try {
            setSavingId(item.id);
            const res = await fetch('/api/admin/media', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: item.id,
                    alt_text: nextAltText,
                }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update alt text');
            }

            setMediaItems((current) => current.map((entry) => (
                entry.id === item.id ? data.media : entry
            )));
            setAltTextDrafts((current) => ({
                ...current,
                [item.id]: data.media.alt_text || '',
            }));
            setNotice({ tone: 'success', text: 'Alt text saved.' });
        } catch (error) {
            console.error('Alt text save failed', error);
            setNotice({ tone: 'error', text: error.message || 'Failed to save alt text.' });
        } finally {
            setSavingId(null);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const availableFolders = useMemo(() => {
        const folders = new Set();

        mediaItems.forEach((item) => {
            folders.add(item.folder || 'root');
        });

        return ['all', ...Array.from(folders).sort((left, right) => left.localeCompare(right))];
    }, [mediaItems]);

    const filteredMedia = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return mediaItems.filter((item) => {
            const itemFolder = item.folder || 'root';
            const haystack = [
                item.file_name,
                item.alt_text,
                itemFolder,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const matchesFolder = selectedFolder === 'all' || itemFolder === selectedFolder;
            const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

            return matchesFolder && matchesSearch;
        });
    }, [mediaItems, searchTerm, selectedFolder]);

    return (
        <div className="admin-media-wrapper">
            <div className="admin-page-header">
                <h1>Media Library</h1>
                <p>Upload images, convert to WebP automatically, manage asset metadata, and keep files organized with basic folder paths.</p>
            </div>

            <div className="blog-toolbar">
                <div className="leads-search">
                    <input type="text" placeholder="Search filename or alt text..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div style={{ position: 'relative' }}>
                    <button className="btn-upload" disabled={uploading}>
                        <span>{uploading ? '⏳' : '⬆️'}</span> {uploading ? 'Processing...' : 'Upload Image'}
                    </button>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        disabled={uploading}
                    />
                </div>
            </div>

            <div className="media-folder-toolbar">
                <div className="media-folder-field">
                    <label htmlFor="media-folder-filter">Folder Filter</label>
                    <select id="media-folder-filter" value={selectedFolder} onChange={(event) => setSelectedFolder(event.target.value)}>
                        {availableFolders.map((folder) => (
                            <option key={folder} value={folder}>
                                {folder === 'all' ? 'All folders' : folder}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="media-folder-field grow">
                    <label htmlFor="media-upload-folder">Upload Folder</label>
                    <input
                        id="media-upload-folder"
                        type="text"
                        value={uploadFolder}
                        onChange={(event) => setUploadFolder(event.target.value)}
                        placeholder="e.g. campaigns/summer-drive"
                    />
                    <p>Optional. Use slash-separated paths for basic nested folders.</p>
                </div>
            </div>

            {availableFolders.length > 1 && (
                <div className="media-folder-list">
                    {availableFolders.map((folder) => (
                        <button
                            key={folder}
                            type="button"
                            className={`media-folder-chip ${selectedFolder === folder ? 'active' : ''}`}
                            onClick={() => setSelectedFolder(folder)}
                        >
                            {folder === 'all' ? 'All folders' : folder}
                        </button>
                    ))}
                </div>
            )}

            {notice && (
                <div className={`media-notice ${notice.tone === 'error' ? 'error' : ''}`}>
                    {notice.text}
                </div>
            )}

            {loading ? (
                <p>Loading media library...</p>
            ) : (
                <div className="media-grid">
                    {filteredMedia.map(item => {
                        const draftAltText = altTextDrafts[item.id] ?? item.alt_text ?? '';
                        const isDirty = draftAltText.trim() !== String(item.alt_text || '').trim();

                        return (
                        <div key={item.id} className="media-card">
                            <div className="media-thumbnail">
                                <img src={item.thumbnail_url || item.file_url} alt={draftAltText || item.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div className="media-overlay">
                                    <button className="btn-media-action" onClick={() => handleCopy(item.file_url)}>Copy URL</button>
                                    <button className="btn-media-action delete" onClick={() => handleDelete(item.id)}>Delete</button>
                                </div>
                            </div>
                            <div className="media-info">
                                <p className="media-title" title={item.file_name}>{item.file_name}</p>
                                <p className="media-meta">
                                    {formatBytes(item.size_bytes)} • {item.width}x{item.height} • {new Date(item.created_at).toLocaleDateString()}
                                </p>
                                <button type="button" className="media-folder-chip inline" onClick={() => setSelectedFolder(item.folder || 'root')}>
                                    {item.folder || 'root'}
                                </button>
                                {item.draft_id && (
                                    <a className="media-link" href={`/admin/ccc/drafts/${item.draft_id}`}>
                                        Open linked draft
                                    </a>
                                )}
                                <div className="media-alt-form">
                                    <label className="media-alt-label" htmlFor={`media-alt-${item.id}`}>Alt text</label>
                                    <textarea
                                        id={`media-alt-${item.id}`}
                                        className="media-alt-input"
                                        value={draftAltText}
                                        onChange={(event) => handleAltTextChange(item.id, event.target.value)}
                                        placeholder="Describe this image for SEO and accessibility"
                                    />
                                    <div className="media-inline-actions">
                                        <button
                                            type="button"
                                            className="btn-media-inline"
                                            onClick={() => handleAltTextSave(item)}
                                            disabled={!isDirty || savingId === item.id}
                                        >
                                            {savingId === item.id ? 'Saving...' : 'Save Alt Text'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-media-inline subtle"
                                            onClick={() => handleAltTextReset(item)}
                                            disabled={!isDirty || savingId === item.id}
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );})}
                    {filteredMedia.length === 0 && (
                        <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                            {mediaItems.length === 0 ? 'No media found.' : 'No media matches the current search or folder filter.'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default MediaContent;
