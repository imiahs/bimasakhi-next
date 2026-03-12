'use client';

import { useContext } from 'react';
import ApplyForm from '@/features/leads/ApplyForm';
import { UserContext } from '@/context/UserContext';
import '@/styles/ApplyPage.css';

const ApplyContent = () => {
    const { userState } = useContext(UserContext);

    const missingSteps = [];
    if (!userState.visitedPages.includes('income')) missingSteps.push('Income Reality');
    if (!userState.visitedPages.includes('eligibility')) missingSteps.push('Eligibility');

    return (
        <div className="apply-page-wrapper">

            {/* === HERO SECTION === */}
            <section className="apply-hero-section">
                <div className="apply-hero-badge">🏛️ LIC of India — Government Enterprise</div>
                <h1 className="apply-hero-title">
                    Start Your Career as a<br />
                    <span className="highlight-text">Certified Insurance Professional</span>
                </h1>
                <p className="apply-hero-subtitle">
                    Join the Bima Sakhi Program under LIC of India. Earn monthly stipend + unlimited commissions.
                </p>
            </section>

            {/* === INCOME HIGHLIGHTS === */}
            <section className="apply-income-strip">
                <div className="income-highlight-card">
                    <div className="income-amount">₹7,000<span>/mo</span></div>
                    <div className="income-label">Monthly Stipend</div>
                    <div className="income-detail">For first 3 years</div>
                </div>
                <div className="income-highlight-card">
                    <div className="income-amount">25-35%</div>
                    <div className="income-label">First Year Commission</div>
                    <div className="income-detail">On every policy sold</div>
                </div>
                <div className="income-highlight-card">
                    <div className="income-amount">5-7.5%</div>
                    <div className="income-label">Renewal Commission</div>
                    <div className="income-detail">Lifetime passive income</div>
                </div>
            </section>

            {/* === TRUST BADGES === */}
            <div className="apply-trust-strip">
                <span className="trust-chip">🏛️ Government Backed</span>
                <span className="trust-chip">📜 67+ Years Legacy</span>
                <span className="trust-chip">🇮🇳 30 Cr+ Policyholders</span>
                <span className="trust-chip">✅ IRDA Regulated</span>
                <span className="trust-chip">💰 No Joining Fee</span>
            </div>

            {/* === SKIPPED STEPS WARNING (original logic kept) === */}
            {userState.source === 'website' && missingSteps.length > 0 && (
                <div className="apply-warning-banner">
                    <p>⚠️ You have skipped important details ({missingSteps.join(', ')}).</p>
                    <p>Please make sure you understand this is a <strong>COMMISSION-ONLY</strong> role.</p>
                </div>
            )}

            {/* === FORM SECTION === */}
            <section className="apply-form-container">
                <h2 className="apply-form-heading">📝 Complete Your Application</h2>
                <p className="apply-form-subheading">Fill all 4 steps below. It takes less than 3 minutes.</p>
                <ApplyForm />
            </section>

            {/* === BOTTOM BENEFITS === */}
            <section className="apply-benefits-section">
                <div className="benefit-item">
                    <span className="benefit-icon">🎓</span>
                    <div>
                        <strong>Free Training</strong>
                        <p>Complete IRDA exam preparation provided at no cost</p>
                    </div>
                </div>
                <div className="benefit-item">
                    <span className="benefit-icon">📱</span>
                    <div>
                        <strong>Work From Anywhere</strong>
                        <p>Flexible hours, no fixed office required</p>
                    </div>
                </div>
                <div className="benefit-item">
                    <span className="benefit-icon">🤝</span>
                    <div>
                        <strong>Personal Mentorship</strong>
                        <p>Dedicated Development Officer guides your growth</p>
                    </div>
                </div>
                <div className="benefit-item">
                    <span className="benefit-icon">💼</span>
                    <div>
                        <strong>Unlimited Earning</strong>
                        <p>No cap on commissions. Your effort = your income</p>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default ApplyContent;
