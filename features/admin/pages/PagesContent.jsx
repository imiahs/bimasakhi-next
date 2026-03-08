'use client';

import React from 'react';
import './Pages.css';

const mockPages = [
    { id: 1, title: 'Homepage / Ads Landing', url: '/', lastUpdated: '2 Days Ago' },
    { id: 2, title: 'Why Join (Benefits)', url: '/why', lastUpdated: '1 Week Ago' },
    { id: 3, title: 'Income Structure', url: '/income', lastUpdated: '1 Month Ago' },
    { id: 4, title: 'About Us', url: '/about', lastUpdated: '3 Months Ago' },
];

const PagesContent = () => {
    return (
        <div className="admin-pages-wrapper">
            <div className="admin-page-header">
                <h1>Page Builder & Content Editor</h1>
                <p>Modify hero sections, CTAs, and structural copy without writing code.</p>
            </div>

            <div className="pages-list">
                {mockPages.map(page => (
                    <div key={page.id} className="page-item">
                        <div className="page-info">
                            <h3>{page.title}</h3>
                            <p>Route: {page.url} • Last Updated: {page.lastUpdated}</p>
                        </div>
                        <div className="page-actions">
                            <button className="btn-builder">🛠️ Launch Visual Editor</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PagesContent;
