'use client';

import React, { useState, useEffect } from 'react';
import './CommandPalette.css';

const CommandPalette = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isAiMode, setIsAiMode] = useState(false);
    const [aiResponse, setAiResponse] = useState('');

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (searchQuery.toLowerCase().startsWith('/ai') || searchQuery.toLowerCase().startsWith('ask')) {
            setIsAiMode(true);
            setAiResponse('Thinking... Parsing website data to answer your question.');

            const timer = setTimeout(() => {
                setAiResponse(`Here is a generated draft or insight based on your request: "${searchQuery.replace('/ai ', '').replace('ask ', '')}". Would you like me to create a blog post or send a WhatsApp message about this?`);
            }, 1200);

            return () => clearTimeout(timer);
        } else {
            setIsAiMode(false);
            setAiResponse('');
        }
    }, [searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette-modal" onClick={(e) => e.stopPropagation()}>
                <div className="command-search-bar">
                    <span className="search-icon">✨</span>
                    <input
                        type="text"
                        placeholder="Type '/ai ...' to Ask AI Assistant, or search leads, posts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <kbd className="esc-key">ESC</kbd>
                </div>

                <div className="command-results-area">
                    {isAiMode ? (
                        <div className="ai-response-box">
                            <h4 className="ai-title">🤖 AI Assistant Active</h4>
                            <p className="ai-text">{aiResponse}</p>
                            <div className="ai-actions">
                                <button className="ai-btn primary">Draft Blog Post</button>
                                <button className="ai-btn secondary">Generate WhatsApp Reply</button>
                            </div>
                        </div>
                    ) : searchQuery ? (
                        <div className="search-results-box">
                            <h4 className="actions-title">Search Results for "{searchQuery}"</h4>
                            <ul>
                                <li><span>📄</span> <strong>Page:</strong> /apply</li>
                                <li><span>📝</span> <strong>Blog:</strong> LIC Agent Salary Details</li>
                                <li><span>👥</span> <strong>Lead:</strong> Search in Contacts</li>
                            </ul>
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
