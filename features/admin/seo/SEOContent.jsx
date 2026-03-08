'use client';

import React from 'react';
import './SEO.css';

const SEORoutes = [
    { id: 1, path: '/', title: 'Bima Sakhi - LIC Agency Career for Women (Delhi NCR)', desc: 'Join Bima Sakhi, a premier LIC agency career platform for women in Delhi NCR. High commission structure with full mentorship.' },
    { id: 2, path: '/why', title: 'Why Become Bima Sakhi? – LIC Career Benefits', desc: 'Secure your financial independence. Discover the benefits of becoming an LIC agent with Bima Sakhi.' },
];

const SEOContent = () => {
    return (
        <div className="admin-seo-wrapper">
            <div className="admin-page-header">
                <h1>Global SEO Manager</h1>
                <p>Override metadata, canonicals, and preview Google Search snippets.</p>
            </div>

            <div className="seo-routes-grid">
                {SEORoutes.map(route => (
                    <div key={route.id} className="seo-route-card">
                        <div className="seo-route-header">
                            <span className="route-path">{route.path}</span>
                            <button className="btn-edit">✏️ Edit Metadata</button>
                        </div>

                        <div className="seo-snippet-preview">
                            <div className="seo-preview-url">https://bimasakhi.com{route.path}</div>
                            <h3 className="seo-preview-title">{route.title}</h3>
                            <p className="seo-preview-desc">{route.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SEOContent;
