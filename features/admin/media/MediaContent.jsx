'use client';

import React, { useState, useEffect } from 'react';
import './Media.css';

const MediaContent = () => {
    const [mediaItems, setMediaItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/media');
            const data = await res.json();
            if (data.media) {
                setMediaItems(data.media);
            }
        } catch (error) {
            console.error('Failed to fetch media', error);
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
            formData.append('file', file);

            const res = await fetch('/api/admin/media/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                fetchMedia(); // Refresh list
            } else {
                const data = await res.json();
                alert(`Upload failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Upload error', error);
            alert('An upload error occurred.');
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleCopy = (url) => {
        navigator.clipboard.writeText(url);
        // Simple visual feedback could go here
        alert('URL Copied to clipboard!');
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this media record?')) return;
        try {
            const res = await fetch(`/api/admin/media?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchMedia();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="admin-media-wrapper">
            <div className="admin-page-header">
                <h1>Media Library</h1>
                <p>Upload images, convert to WebP automatically, and manage assets.</p>
            </div>

            <div className="blog-toolbar">
                <div className="leads-search">
                    <input type="text" placeholder="Search media..." />
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

            {loading ? (
                <p>Loading media library...</p>
            ) : (
                <div className="media-grid">
                    {mediaItems.map(item => (
                        <div key={item.id} className="media-card">
                            <div className="media-thumbnail">
                                <img src={item.file_url} alt={item.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div className="media-info">
                                <p className="media-title" title={item.file_name}>{item.file_name}</p>
                                <p className="media-meta">
                                    {formatBytes(item.size_bytes)} • {item.width}x{item.height} • {new Date(item.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="media-overlay">
                                <button className="btn-media-action" onClick={() => handleCopy(item.file_url)}>Copy URL</button>
                                <button className="btn-media-action delete" onClick={() => handleDelete(item.id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                    {mediaItems.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>No media found.</p>}
                </div>
            )}
        </div>
    );
};

export default MediaContent;
