'use client';

import Link from 'next/link';
import '@/styles/Tools.css';

const ToolsIndex = () => {
    return (
        <div className="tools-container">
            <section className="tools-hero">
                <div className="container">
                    <h1>LIC Agent Tools & Calculators</h1>
                    <p className="subtitle">Use our free tools to estimate your potential earnings, understand commission structures, and plan your LIC agency career.</p>
                </div>
            </section>

            <section className="tools-grid-section container py-12">
                <div className="tools-grid">
                    {/* Income Calculator Card */}
                    <div className="tool-card">
                        <div className="tool-icon">
                            <span role="img" aria-label="calculator">🧮</span>
                        </div>
                        <h3>LIC Agent Income Calculator</h3>
                        <p>Estimate your monthly and yearly income based on the number of policies you plan to sell and average premiums.</p>
                        <Link href="/tools/lic-income-calculator" className="tool-btn">
                            Open Calculator →
                        </Link>
                    </div>

                    {/* Commission Calculator Card */}
                    <div className="tool-card">
                        <div className="tool-icon">
                            <span role="img" aria-label="chart">📊</span>
                        </div>
                        <h3>LIC Commission Calculator</h3>
                        <p>Calculate exact first-year and renewal commission breakdowns for different LIC policy premiums and terms.</p>
                        <Link href="/tools/lic-commission-calculator" className="tool-btn">
                            Open Calculator →
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ToolsIndex;
