'use client';

import React from 'react';
import './Media.css';

const mockMedia = [
    { id: 1, name: 'hero-banner-main.webp', size: '145 KB', date: 'Mar 1, 2026' },
    { id: 2, name: 'raj-kumar-profile.jpg', size: '320 KB', date: 'Feb 15, 2026' },
    { id: 3, name: 'commission-chart-mini.svg', size: '12 KB', date: 'Jan 10, 2026' },
    { id: 4, name: 'blog-cover-income.webp', size: '89 KB', date: 'Mar 8, 2026' },
];

const MediaContent = () => {
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
                <button className="btn-upload">
                    <span>⬆️</span> Upload Image
                </button>
            </div>

            <div className="media-grid">
                {mockMedia.map(item => (
                    <div key={item.id} className="media-card">
                        <div className="media-thumbnail">🖼️</div>
                        <div className="media-info">
                            <p className="media-title">{item.name}</p>
                            <p className="media-meta">{item.size} • {item.date}</p>
                        </div>
                        <div className="media-overlay">
                            <button className="btn-media-action">Copy URL</button>
                            <button className="btn-media-action delete">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MediaContent;
