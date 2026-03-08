'use client';

import React, { useState } from 'react';
import './Blog.css';

const mockPosts = [
    { id: 1, title: 'LIC Bima Sakhi Income Explained', status: 'published', date: 'Mar 8, 2026', views: 1240 },
    { id: 2, title: 'How to Become LIC Agent Step by Step', status: 'published', date: 'Mar 5, 2026', views: 890 },
    { id: 3, title: '10 Secrets to High Commission in 2026', status: 'draft', date: 'Draft', views: 0 },
];

const BlogContent = () => {
    return (
        <div className="admin-blog-wrapper">
            <div className="admin-page-header">
                <h1>Blog & Content Manager</h1>
                <p>Create articles, manage SEO, and use AI to generate outlines.</p>
            </div>

            <div className="blog-toolbar">
                <div className="leads-search">
                    <input type="text" placeholder="Search posts..." />
                </div>
                <button className="btn-create">
                    <span>✨</span> Create New Post
                </button>
            </div>

            <div className="blog-grid">
                {mockPosts.map(post => (
                    <div key={post.id} className="blog-card">
                        <div className="blog-card-image">🖼️</div>
                        <div className="blog-card-content">
                            <div className="blog-card-meta">
                                <span className={`blog-status status-${post.status}`}>{post.status.toUpperCase()}</span>
                                <span>{post.date}</span>
                            </div>
                            <h3 className="blog-card-title">{post.title}</h3>
                            <p className="text-sm text-gray-500 mb-4">👁️ {post.views} Views</p>

                            <div className="blog-card-actions">
                                <button className="btn-edit">✏️ Edit Content</button>
                                <button className="btn-seo">🔍 AI SEO</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BlogContent;
