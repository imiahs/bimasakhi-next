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

    // Detect AI intent but show honest "not available" state
    const isAiQuery = searchQuery.toLowerCase().startsWith('/ai') || searchQuery.toLowerCase().startsWith('ask');

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette-modal" onClick={(e) => e.stopPropagation()}>
                <div className="command-search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search leads, posts, or pages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <kbd className="esc-key">ESC</kbd>
                </div>

                <div className="command-results-area">
                    {isAiQuery ? (
                        <div className="ai-response-box">
                            <h4 className="ai-title">🤖 AI Assistant</h4>
                            <p className="ai-text">AI assistant is not yet connected to a real provider. This feature will be activated once the AI pipeline is operational.</p>
                        </div>
                    ) : searchQuery ? (
                        <div className="search-results-box">
                            <h4 className="actions-title">Search Results for &quot;{searchQuery}&quot;</h4>
                            <p className="ai-text">Search functionality requires backend integration. Use the admin panels to browse leads and content.</p>
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
