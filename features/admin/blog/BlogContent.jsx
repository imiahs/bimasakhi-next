'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import RichTextEditor from '../../../components/admin/RichTextEditor';
import './Blog.css';

const BlogContent = () => {
    const searchParams = useSearchParams();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [currentPost, setCurrentPost] = useState(null);
    const [autoOpenedEditId, setAutoOpenedEditId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        meta_title: '',
        meta_description: '',
        canonical_url: '',
        robots_setting: '',
        content: '',
        status: 'draft',
        author: 'Admin'
    });

    const requestedEditId = searchParams.get('edit');

    useEffect(() => {
        fetchPosts();
    }, []);

    useEffect(() => {
        if (!requestedEditId || loading || editorOpen || autoOpenedEditId === requestedEditId) {
            return;
        }

        const matchedPost = posts.find((post) => post.id === requestedEditId);
        if (!matchedPost) {
            return;
        }

        handleEdit(matchedPost);
        setAutoOpenedEditId(requestedEditId);
    }, [autoOpenedEditId, editorOpen, loading, posts, requestedEditId]);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/blog');
            const data = await res.json();
            if (data.posts) {
                setPosts(data.posts);
            }
        } catch (error) {
            console.error('Failed to load posts', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setCurrentPost(null);
        setFormData({
            title: '',
            slug: '',
            meta_title: '',
            meta_description: '',
            canonical_url: '',
            robots_setting: '',
            content: '',
            status: 'draft',
            author: 'Admin'
        });
        setEditorOpen(true);
    };

    const handleEdit = (post) => {
        setCurrentPost(post);
        setFormData({
            title: '',
            slug: '',
            meta_title: '',
            meta_description: '',
            canonical_url: '',
            robots_setting: '',
            content: '',
            status: 'draft',
            author: 'Admin',
            ...post,
        });
        setEditorOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            const res = await fetch(`/api/admin/blog?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchPosts();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const method = currentPost ? 'PUT' : 'POST';
            const payload = currentPost ? { ...formData, id: currentPost.id } : formData;

            const res = await fetch('/api/admin/blog', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setEditorOpen(false);
                fetchPosts();
            } else {
                alert('Save failed.');
            }
        } catch (error) {
            console.error('Save error', error);
        }
    };

    return (
        <div className="admin-blog-wrapper">
            {!editorOpen ? (
                <>
                    <div className="admin-page-header">
                        <h1>Blog & Content Manager</h1>
                        <p>Create articles, manage SEO, and use TipTap editor.</p>
                    </div>

                    <div className="blog-toolbar">
                        <div className="leads-search">
                            <input type="text" placeholder="Search posts..." />
                        </div>
                        <button className="btn-create" onClick={handleCreateNew}>
                            <span>✨</span> Create New Post
                        </button>
                    </div>

                    {loading ? (
                        <p>Loading posts...</p>
                    ) : (
                        <div className="blog-grid">
                            {posts.map(post => (
                                <div key={post.id} className="blog-card">
                                    <div className="blog-card-image">🖼️</div>
                                    <div className="blog-card-content">
                                        <div className="blog-card-meta">
                                            <span className={`blog-status status-${post.status}`}>{post.status.toUpperCase()}</span>
                                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="blog-card-title">{post.title}</h3>
                                        <p className="text-sm text-gray-500 mb-4">👁️ {post.views || 0} Views</p>

                                        <div className="blog-card-actions">
                                            <button className="btn-edit" onClick={() => handleEdit(post)}>✏️ Edit</button>
                                            <button className="btn-seo" onClick={() => handleDelete(post.id)}>🗑️ Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {posts.length === 0 && <p>No posts found. Create one!</p>}
                        </div>
                    )}
                </>
            ) : (
                <div className="blog-editor-view">
                    <div className="admin-page-header">
                        <h1>{currentPost ? 'Edit Post' : 'Create New Post'}</h1>
                        <button className="btn-secondary" onClick={() => setEditorOpen(false)}>← Back to list</button>
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
                            <div className="form-col">
                                <label>Slug</label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="auto-generated-if-empty"
                                />
                            </div>
                        </div>

                        <div className="form-group flex-row">
                            <div className="form-col">
                                <label>Meta Title (SEO)</label>
                                <input
                                    type="text"
                                    value={formData.meta_title}
                                    onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                                />
                            </div>
                            <div className="form-col">
                                <label>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Meta Description</label>
                            <textarea
                                value={formData.meta_description}
                                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                                rows="2"
                            />
                        </div>

                        <div className="form-group flex-row">
                            <div className="form-col">
                                <label>Canonical URL</label>
                                <input
                                    type="text"
                                    value={formData.canonical_url || ''}
                                    onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                                    placeholder="https://bimasakhi.com/blog/example"
                                />
                            </div>
                            <div className="form-col">
                                <label>Robots</label>
                                <select
                                    value={formData.robots_setting || ''}
                                    onChange={(e) => setFormData({ ...formData, robots_setting: e.target.value })}
                                >
                                    <option value="">Runtime default</option>
                                    <option value="index,follow">index,follow</option>
                                    <option value="noindex,follow">noindex,follow</option>
                                    <option value="noindex,nofollow">noindex,nofollow</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Content</label>
                            <RichTextEditor
                                content={formData.content}
                                onChange={(val) => setFormData({ ...formData, content: val })}
                            />
                        </div>

                        <button type="submit" className="btn-primary" style={{ marginTop: '20px' }}>
                            {currentPost ? 'Update Post' : 'Publish Post'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default BlogContent;
