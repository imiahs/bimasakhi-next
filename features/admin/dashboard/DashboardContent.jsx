'use client';

import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const DashboardContent = () => {
    // Live Data State
    const [stats, setStats] = useState({
        totalLeads: 0,
        totalPosts: 0,
        resourceDownloads: 0,
        conversionRate: '0%',
    });

    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await fetch('/api/admin/dashboard');
                const data = await res.json();
                if (data.stats) setStats(data.stats);
                if (data.recentActivity) setRecentActivity(data.recentActivity);
            } catch (error) {
                console.error("Failed to load dashboard metrics", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading Live Analytics...</div>;
    }

    return (
        <div className="admin-dashboard-wrapper">
            <div className="admin-page-header">
                <h1>Dashboard Overview</h1>
                <p>Live metrics aggregating from Database endpoints.</p>
            </div>

            {/* Top Metrics Row */}
            <div className="metric-cards-grid">
                <div className="metric-card">
                    <div className="metric-icon bg-blue-100 text-blue-600">👥</div>
                    <div className="metric-content">
                        <h3>Total Leads</h3>
                        <div className="metric-value">{stats.totalLeads}</div>
                        <div className="metric-trend neutral">All Time Processing</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon bg-green-100 text-green-600">✍️</div>
                    <div className="metric-content">
                        <h3>Blog Posts</h3>
                        <div className="metric-value">{stats.totalPosts}</div>
                        <div className="metric-trend positive">Total Published & Drafts</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon bg-purple-100 text-purple-600">📁</div>
                    <div className="metric-content">
                        <h3>Downloads</h3>
                        <div className="metric-value">{stats.resourceDownloads || 0}</div>
                        <div className="metric-trend positive">Total Asset Usage</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon bg-orange-100 text-orange-600">⚡</div>
                    <div className="metric-content">
                        <h3>Conversion Rate</h3>
                        <div className="metric-value">{stats.conversionRate}</div>
                        <div className="metric-trend neutral">- (Needs Analytics Link)</div>
                    </div>
                </div>
            </div>

            <div className="dashboard-content-grid">
                {/* Main Chart Area Placeholder */}
                <div className="chart-panel">
                    <h3>Traffic vs Leads (Coming Soon)</h3>
                    <div className="chart-placeholder">
                        <span className="text-gray-400">Google Analytics Integration Pending</span>
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="activity-panel">
                    <h3>Recent Database Activity</h3>
                    {recentActivity.length === 0 ? (
                        <p style={{ color: '#666', marginTop: '10px' }}>No recent activity to show.</p>
                    ) : (
                        <ul className="activity-list">
                            {recentActivity.map(activity => (
                                <li key={activity.id} className="activity-item">
                                    <span className={`activity-dot ${activity.type}`}></span>
                                    <div className="activity-details">
                                        <strong>{activity.action}</strong>
                                        <p>{activity.detail}</p>
                                        <small>{activity.time}</small>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardContent;
