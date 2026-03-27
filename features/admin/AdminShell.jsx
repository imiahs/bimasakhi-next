'use client';

import React, { useState, useContext, useEffect } from 'react';
import { ConfigContext } from '../../context/ConfigContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import useIdleTimer from '../../hooks/useIdleTimer';
import InsightsTab from './tabs/InsightsTab';
import LeadsTab from './tabs/LeadsTab';
import GlobalSettingsTab from './tabs/GlobalSettingsTab';
import HomeEditorTab from './tabs/HomeEditorTab';

const AdminShell = () => {
    const { config, refreshConfig } = useContext(ConfigContext);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState({ loading: false, msg: '' });
    const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'leads' | 'global' | 'home' | 'tracking'

    // Config State
    const [formData, setFormData] = useState(config);

    // Sync form with config when config loads
    useEffect(() => {
        setFormData(config);
    }, [config]);

    // Check Auth on Mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/admin/check', {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (data.authenticated) {
                    setIsAuthenticated(true);
                }
            } catch (err) {
                console.error("Auth Check Failed", err);
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    const handleLogin = async () => {
        if (!password) return;
        setStatus({ loading: true, msg: 'Logging in...' });
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (!res.ok) throw new Error('Invalid Password');
            await res.json();
            setIsAuthenticated(true);
            setStatus({ loading: false, msg: '' });
        } catch (error) {
            console.error(error);
            setStatus({ loading: false, msg: 'Login Failed: Invalid Password' });
            alert("Invalid Password");
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/admin/logout', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            setIsAuthenticated(false);
            setPassword('');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // --- Idle Timer Logic ---
    const { isIdle, isPrompted, remaining } = useIdleTimer({
        timeout: 900000,       // 15 Minutes
        promptTimeout: 840000, // 14 Minutes
        onIdle: () => {
            if (isAuthenticated) {
                console.log("Idle Timeout - Logging out");
                handleLogout();
            }
        }
    });

    const handleConfigSave = async () => {
        setStatus({ loading: true, msg: 'Saving...' });
        try {
            // No custom headers needed, credentials (cookies) sent automatically by browser 
            // BUT for axios we might need withCredentials: true if cross-origin, 
            // but here it is same-origin so it should be fine.
            // However, just to be safe with axios defaults:
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!res.ok) {
                if (res.status === 401) {
                    setIsAuthenticated(false);
                    alert("Session Expired");
                    throw new Error('Unauthorized');
                }
                throw new Error('Failed to save config');
            }
            await res.json();

            setStatus({ loading: false, msg: 'Saved Successfully!' });
            refreshConfig();
        } catch (error) {
            console.error(error);
            setStatus({ loading: false, msg: 'Error: Unauthorized or Network Fail' });
        }
    };

    // --- Renderers ---

    if (!isAuthenticated) {
        return (
            <div className="container py-8 text-center" style={{ maxWidth: '400px' }}>
                <h1>Admin Access</h1>
                <Input
                    type="password"
                    placeholder="Enter Admin Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button onClick={handleLogin}>Login</Button>
            </div>
        );
    }

    return (
        <div className="page-admin container relative">
            {/* Idle Warning Modal */}
            {isPrompted && isAuthenticated && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Card style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <h2 className="text-red-500">Session Expiring</h2>
                        <p>You have been inactive for a while.</p>
                        <p className="text-2xl font-bold my-4">{remaining}s</p>
                        <p>Move your mouse or click to stay logged in.</p>
                    </Card>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1>Admin Dashboard</h1>
                <Button onClick={handleLogout} variant="destructive">Logout</Button>
            </div>
            <p className="text-sm mb-4">Status: Environment Stable</p>
            {status.msg && <div className="alert-box mb-4">{status.msg}</div>}

            <div className="admin-tabs" style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
                <button
                    style={{ padding: '10px 20px', fontWeight: activeTab === 'insights' ? 'bold' : 'normal' }}
                    onClick={() => setActiveTab('insights')}
                >Insights</button>
                <button
                    style={{ padding: '10px 20px', fontWeight: activeTab === 'leads' ? 'bold' : 'normal' }}
                    onClick={() => setActiveTab('leads')}
                >Recent Leads</button>
                <button
                    style={{ padding: '10px 20px', fontWeight: activeTab === 'global' ? 'bold' : 'normal' }}
                    onClick={() => setActiveTab('global')}
                >Global Settings</button>
                <button
                    style={{ padding: '10px 20px', fontWeight: activeTab === 'home' ? 'bold' : 'normal' }}
                    onClick={() => setActiveTab('home')}
                >Home Page Editor</button>
                <button
                    style={{ padding: '10px 20px', fontWeight: activeTab === 'tracking' ? 'bold' : 'normal' }}
                    onClick={() => setActiveTab('tracking')}
                >Tracking</button>
            </div>

            {activeTab === 'insights' && (
                <InsightsTab />
            )}

            {activeTab === 'leads' && (
                <LeadsTab />
            )}

            {activeTab === 'global' && (
                <GlobalSettingsTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'home' && (
                <HomeEditorTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'tracking' && (
                <Card><p>Tracking settings coming soon.</p></Card>
            )}

            <div className="floating-save" style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
                <Button onClick={handleConfigSave} disabled={status.loading} variant="primary">
                    {status.loading ? 'Saving...' : 'Save Configuration'}
                </Button>
            </div>
        </div>
    );
};

export default AdminShell;
