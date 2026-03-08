'use client';

import React from 'react';
import './Resources.css';

const mockResources = [
    { id: 1, title: 'IC-38 Exam Guide (Hindi)', icon: '📄', downloads: 1450, gated: true },
    { id: 2, title: 'LIC Commission Structure', icon: '📊', downloads: 853, gated: true },
    { id: 3, title: 'Welcome Sales Script', icon: '📞', downloads: 320, gated: false },
];

const ResourcesContent = () => {
    return (
        <div className="admin-resources-wrapper">
            <div className="admin-page-header">
                <h1>Resources Manager</h1>
                <p>Upload files, PDFs, and manage lead gating requirements.</p>
            </div>

            <div className="blog-toolbar">
                <div className="leads-search">
                    <input type="text" placeholder="Search resources..." />
                </div>
                <button className="btn-upload">
                    <span>⬆️</span> Upload Resource
                </button>
            </div>

            <div className="resources-grid">
                {mockResources.map(resource => (
                    <div key={resource.id} className="resource-card">
                        <div className="resource-icon">{resource.icon}</div>
                        <div className="resource-details">
                            <h3 className="resource-title">{resource.title}</h3>
                            <p className="resource-description">Lead capture required: {resource.gated ? '✅' : '❌'}</p>

                            <div className="resource-meta">
                                <span>📥 {resource.downloads} Downloads</span>
                            </div>

                            <div className="resource-actions">
                                <button className="btn-edit">⚙️ Settings</button>
                                <button className="btn-seo">🗑️ Replace File</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResourcesContent;
