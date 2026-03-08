'use client';

import React, { useState, useEffect } from 'react';
import './CommandPalette.css';

const CommandPalette = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette-modal" onClick={(e) => e.stopPropagation()}>
                <div className="command-search-bar">
                    <span className="search-icon">✨</span>
                    <input
                        type="text"
                        placeholder="Ask AI Assistant or Search leads, posts, pages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <kbd className="esc-key">ESC</kbd>
                </div>

                <div className="command-results-area">
                    {searchQuery ? (
                        <div className="ai-response-box">
                            <h4 className="ai-title">🤖 AI Assistant Suggestion</h4>
                            <p className="ai-text">Generating SEO metadata or finding leads matching "{searchQuery}"...</p>
                            <div className="ai-actions">
                                <button className="ai-btn primary">Draft Blog Post</button>
                                <button className="ai-btn secondary">Generate WhatsApp Reply</button>
                            </div>
                        </div>
                    ) : (
                        <div className="quick-actions-grid">
                            <h4 className="actions-title">Quick Actions</h4>
                            <ul>
                                <li><span>📝</span> Create New Blog Post</li>
                                <li><span>👥</span> View Recent Leads</li>
                                <li><span>⚙️</span> Open Settings</li>
                                <li><span>📊</span> Check Today's Traffic</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
