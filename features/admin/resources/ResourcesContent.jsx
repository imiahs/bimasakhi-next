'use client';

import React, { useState, useEffect } from 'react';
import './Resources.css';

const ResourcesContent = () => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Modal state
    const [isEditing, setIsEditing] = useState(false);
    const [currentDoc, setCurrentDoc] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        file_url: '',
        requires_lead_form: true
    });

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/resources');
            const data = await res.json();
            if (data.resources) {
                setResources(data.resources);
            }
        } catch (error) {
            console.error('Failed to load resources', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const uploadData = new FormData();
            uploadData.append('file', file);

            const res = await fetch('/api/admin/resources/upload', {
                method: 'POST',
                body: uploadData
            });

            const data = await res.json();

            if (res.ok && data.file_url) {
                // Immediately open edit modal for the newly uploaded file
                setFormData({
                    title: file.name.split('.')[0],
                    description: '',
                    file_url: data.file_url,
                    requires_lead_form: true
                });
                setCurrentDoc(null);
                setIsEditing(true);
            } else {
                alert(`Upload failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Upload error', error);
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const method = currentDoc ? 'PUT' : 'POST';
            const payload = currentDoc ? { ...formData, id: currentDoc.id } : formData;

            const res = await fetch('/api/admin/resources', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsEditing(false);
                fetchResources();
            } else {
                alert('Save failed.');
            }
        } catch (error) {
            console.error('Save error', error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;
        try {
            const res = await fetch(`/api/admin/resources?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchResources();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const editResource = (res) => {
        setCurrentDoc(res);
        setFormData({
            title: res.title,
            description: res.description || '',
            file_url: res.file_url,
            requires_lead_form: res.requires_lead_form
        });
        setIsEditing(true);
    };

    return (
        <div className="admin-resources-wrapper">
            {!isEditing ? (
                <>
                    <div className="admin-page-header">
                        <h1>Resources Manager</h1>
                        <p>Upload files, PDFs, and manage lead gating requirements.</p>
                    </div>

                    <div className="blog-toolbar">
                        <div className="leads-search">
                            <input type="text" placeholder="Search resources..." />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button className="btn-upload" disabled={uploading}>
                                <span>{uploading ? '⏳' : '⬆️'}</span> {uploading ? 'Uploading...' : 'Upload Resource'}
                            </button>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                onChange={handleUpload}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                disabled={uploading}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <p>Loading resources...</p>
                    ) : (
                        <div className="resources-grid">
                            {resources.map(resource => (
                                <div key={resource.id} className="resource-card">
                                    <div className="resource-icon">📄</div>
                                    <div className="resource-details">
                                        <h3 className="resource-title">{resource.title}</h3>
                                        <p className="resource-description">Lead capture required: {resource.requires_lead_form ? '✅' : '❌'}</p>

                                        <div className="resource-meta">
                                            <span>📥 {resource.download_count || 0} Downloads</span>
                                        </div>

                                        <div className="resource-actions">
                                            <button className="btn-edit" onClick={() => editResource(resource)}>⚙️ Settings</button>
                                            <button className="btn-seo" onClick={() => handleDelete(resource.id)}>🗑️ Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {resources.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center' }}>No resources found.</p>}
                        </div>
                    )}
                </>
            ) : (
                <div className="blog-editor-view">
                    <div className="admin-page-header">
                        <h1>{currentDoc ? 'Edit Resource' : 'Configure New Resource'}</h1>
                        <button className="btn-secondary" onClick={() => setIsEditing(false)}>← Cancel</button>
                    </div>

                    <form className="blog-editor-form" onSubmit={handleSave}>
                        <div className="form-group flex-row">
                            <div className="form-col">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-col" style={{ display: 'flex', alignItems: 'center', paddingTop: '30px' }}>
                                <input
                                    type="checkbox"
                                    id="gated"
                                    checked={formData.requires_lead_form}
                                    onChange={(e) => setFormData({ ...formData, requires_lead_form: e.target.checked })}
                                    style={{ width: '20px', height: '20px', marginRight: '10px' }}
                                />
                                <label htmlFor="gated" style={{ margin: 0, cursor: 'pointer' }}>Require Lead Capture (Gated Content)</label>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="3"
                                placeholder="Brief description visible on public page"
                            />
                        </div>

                        <div className="form-group">
                            <label>File URL (Immutable post-upload)</label>
                            <input
                                type="text"
                                value={formData.file_url}
                                readOnly
                                disabled
                                style={{ backgroundColor: '#f1f5f9' }}
                            />
                        </div>

                        <button type="submit" className="btn-primary" style={{ marginTop: '20px' }}>
                            {currentDoc ? 'Save Changes' : 'Publish Resource'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ResourcesContent;
