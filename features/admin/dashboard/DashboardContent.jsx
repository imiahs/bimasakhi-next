'use client';

import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const DashboardContent = () => {
    // Mock Data State
    const [stats, setStats] = useState({
        totalLeads: 1245,
        newLeadsToday: 23,
        blogTraffic: '15.2k',
        resourceDownloads: 489,
        conversionRate: '8.4%',
    });

    const [recentActivity, setRecentActivity] = useState([
        { id: 1, action: "New Lead Submitted", detail: "Priya Sharma from Delhi", time: "10 mins ago", type: 'lead' },
        { id: 2, action: "Resource Downloaded", detail: "IC-38 Guide by Amit Kumar", time: "1 hour ago", type: 'download' },
        { id: 3, action: "Tool Used", detail: "Income Calculator (₹15k Premium)", time: "3 hours ago", type: 'tool' },
        { id: 4, action: "Blog Post Read", detail: "LIC Agent Commission Guide", time: "5 hours ago", type: 'blog' },
    ]);

    return (
        <div className="admin-dashboard-wrapper">
            <div className="admin-page-header">
                <h1>Dashboard Overview</h1>
                <p>Real-time metrics and funnel performance.</p>
            </div>

            {/* Top Metrics Row */}
            <div className="metric-cards-grid">
                <div className="metric-card">
                    <div className="metric-icon bg-blue-100 text-blue-600">👥</div>
                    <div className="metric-content">
                        <h3>Total Leads</h3>
                        <div className="metric-value">{stats.totalLeads}</div>
                        <div className="metric-trend positive">↑ 12% vs last month</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon bg-green-100 text-green-600">📈</div>
                    <div className="metric-content">
                        <h3>Blog Traffic</h3>
                        <div className="metric-value">{stats.blogTraffic}</div>
                        <div className="metric-trend positive">↑ 5% vs last month</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon bg-purple-100 text-purple-600">📁</div>
                    <div className="metric-content">
                        <h3>Downloads</h3>
                        <div className="metric-value">{stats.resourceDownloads}</div>
                        <div className="metric-trend neutral">- 0% vs last month</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon bg-orange-100 text-orange-600">⚡</div>
                    <div className="metric-content">
                        <h3>Conversion Rate</h3>
                        <div className="metric-value">{stats.conversionRate}</div>
                        <div className="metric-trend positive">↑ 1.2% vs last month</div>
                    </div>
                </div>
            </div>

            <div className="dashboard-content-grid">
                {/* Main Chart Area Placeholder */}
                <div className="chart-panel">
                    <h3>Traffic vs Leads (30 Days)</h3>
                    <div className="chart-placeholder">
                        <span className="text-gray-400">Chart Visualization Area (Recharts/Chart.js)</span>
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="activity-panel">
                    <h3>Recent Funnel Activity</h3>
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
                </div>
            </div>
        </div>
    );
};

export default DashboardContent;
