'use client';

import React, { useState } from 'react';
import './Tools.css';

const ToolsContent = () => {
    const [configs, setConfigs] = useState({
        firstYearCommission: 25,
        renewalCommission: 5,
        bonusRate: 10,
        defaultPremium: 15000,
        defaultPolicies: 5
    });

    const handleChange = (e) => {
        setConfigs({ ...configs, [e.target.name]: e.target.value });
    };

    const handleSave = (e) => {
        e.preventDefault();
        alert("Calculator parameters updated securely!");
    };

    return (
        <div className="admin-tools-wrapper">
            <div className="admin-page-header">
                <h1>Tools & Calculators Manager</h1>
                <p>Modify mathematical constants and default values for public calculators.</p>
            </div>

            <div className="tools-form-grid">
                <div className="tools-panel">
                    <h3>Commission Calculator Constants</h3>
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label>1st Year Commission Rate (%)</label>
                            <input type="number" name="firstYearCommission" value={configs.firstYearCommission} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Renewal Commission Rate (%)</label>
                            <input type="number" name="renewalCommission" value={configs.renewalCommission} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Bonus Rate / Club Membership (%)</label>
                            <input type="number" name="bonusRate" value={configs.bonusRate} onChange={handleChange} />
                        </div>
                        <button type="submit" className="btn-save">Save Commission Settings</button>
                    </form>
                </div>

                <div className="tools-panel">
                    <h3>Income Calculator Defaults</h3>
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label>Default Avg. Policy Premium (₹)</label>
                            <input type="number" name="defaultPremium" value={configs.defaultPremium} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Default Policies per Month (Count)</label>
                            <input type="number" name="defaultPolicies" value={configs.defaultPolicies} onChange={handleChange} />
                        </div>
                        <button type="submit" className="btn-save">Save Income Defaults</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ToolsContent;
