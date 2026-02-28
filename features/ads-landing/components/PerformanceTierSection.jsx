import React from 'react';
import './PerformanceTierSection.css';

const PerformanceTierSection = () => {

    const tiers = [
        {
            title: "Starter Agent",
            desc: "Building client base",
            potential: "Initial Commission + Stipend Support"
        },
        {
            title: "Growth Agent",
            desc: "Consistent monthly policy sales",
            potential: "New + Renewal Commission"
        },
        {
            title: "Top Performer",
            desc: "Strong client network & referrals",
            potential: "High Recurring Income + Incentives"
        }
    ];

    return (
        <section className="performance-tier-section">

            <h2>Performance-Based Growth Path</h2>

            <div className="tier-grid">
                {tiers.map((tier, index) => (
                    <div key={index} className="tier-card">
                        <h3>{tier.title}</h3>
                        <p>{tier.desc}</p>
                        <strong>{tier.potential}</strong>
                    </div>
                ))}
            </div>

        </section>
    );
};

export default PerformanceTierSection;