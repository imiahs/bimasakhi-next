'use client';

import React, { useState, useEffect } from 'react';
import './Tools.css';

const ToolsContent = () => {
    const [configs, setConfigs] = useState({
        firstYearCommission: 25,
        renewalCommission: 5,
        bonusRate: 10,
        defaultPremium: 15000,
        defaultPolicies: 5
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const res = await fetch('/api/admin/tools');
            const data = await res.json();
            if (data.configs && Object.keys(data.configs).length > 0) {
                // Merge DB configs with defaults to ensure all fields are populated
                setConfigs(prev => ({
                    ...prev,
                    ...data.configs
                }));
            }
        } catch (error) {
            console.error('Failed to load tool configs', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setConfigs({ ...configs, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/tools', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configs)
            });
            if (res.ok) {
                alert("Calculator parameters updated securely!");
            } else {
                alert("Failed to update config params.");
            }
        } catch (error) {
            console.error('Error saving configs', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading Configurations...</div>;

    return (
        <div className="admin-tools-wrapper">
            <div className="admin-page-header">
                <h1>Tools & Calculators Manager</h1>
                <p>Modify mathematical constants and default values for public calculators synced directly from Database limits.</p>
            </div>

            <div className="tools-form-grid">
                <div className="tools-panel">
                    <h3>Commission Calculator Constants</h3>
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label>1st Year Commission Rate (%)</label>
                            <input type="number" step="0.1" name="firstYearCommission" value={configs.firstYearCommission} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Renewal Commission Rate (%)</label>
                            <input type="number" step="0.1" name="renewalCommission" value={configs.renewalCommission} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Bonus Rate / Club Membership (%)</label>
                            <input type="number" step="0.1" name="bonusRate" value={configs.bonusRate} onChange={handleChange} required />
                        </div>
                        <button type="submit" className="btn-save" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Commission Settings'}
                        </button>
                    </form>
                </div>

                <div className="tools-panel">
                    <h3>Income Calculator Defaults</h3>
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label>Default Avg. Policy Premium (₹)</label>
                            <input type="number" name="defaultPremium" value={configs.defaultPremium} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Default Policies per Month (Count)</label>
                            <input type="number" name="defaultPolicies" value={configs.defaultPolicies} onChange={handleChange} required />
                        </div>
                        <button type="submit" className="btn-save" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Income Defaults'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ToolsContent;
