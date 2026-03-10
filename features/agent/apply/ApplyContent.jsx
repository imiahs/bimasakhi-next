'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getWhatsAppUrl } from '@/utils/whatsapp';
import '@/styles/ApplyPage.css';

export default function ApplyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const refCode = searchParams.get('ref') || '';

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        ref_code: refCode
    });

    const [status, setStatus] = useState({ loading: false, success: false, error: '' });

    useEffect(() => {
        if (refCode) {
            setFormData(prev => ({ ...prev, ref_code: refCode }));
        }
    }, [refCode]);

    // GTM page load
    useEffect(() => {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: 'apply_page_loaded',
            source: refCode ? 'referral' : 'organic',
            ref_code: refCode || 'none'
        });
    }, [refCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, success: false, error: '' });

        // Validate mobile (10 digits)
        if (!/^\d{10}$/.test(formData.mobile)) {
            setStatus({ loading: false, success: false, error: 'Please enter a valid 10-digit mobile number.' });
            return;
        }

        try {
            const res = await fetch('/api/agent/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (res.ok) {
                window.dataLayer?.push({
                    event: 'apply_form_submitted',
                    ref_code: refCode || 'none'
                });

                // Redirect to thank-you page with params
                const params = new URLSearchParams({
                    name: formData.name,
                    ref: data.application?.candidate_id || ''
                });
                router.push(`/thank-you?${params.toString()}`);
            } else {
                throw new Error(data.error || 'Failed to submit application');
            }
        } catch (error) {
            setStatus({ loading: false, success: false, error: error.message });
        }
    };

    const whatsappUrl = getWhatsAppUrl({
        name: 'Applicant',
        source: 'Apply Page',
        intent: 'Career Inquiry'
    });

    return (
        <div className="apply-page">

            {/* === HERO SECTION === */}
            <section className="apply-hero">
                <div className="lic-badge">🏛️ LIC of India — Government-Backed</div>
                <h1>Start Your Career as a<br />Certified Insurance Professional</h1>
                <p className="subtitle">
                    Join the Bima Sakhi Program under LIC of India. Earn a monthly stipend of ₹7,000
                    for 3 years + unlimited commissions. Empower yourself financially.
                </p>
            </section>

            <div className="apply-content">

                {/* === INCOME SECTION === */}
                <section className="apply-section">
                    <h2><span className="icon">💰</span> Your Income Potential</h2>
                    <div className="income-grid">
                        <div className="income-card">
                            <div className="amount">₹7,000/mo</div>
                            <div className="label">Monthly Stipend</div>
                            <div className="detail">For first 3 years (Bima Sakhi)</div>
                        </div>
                        <div className="income-card">
                            <div className="amount">25-35%</div>
                            <div className="label">First Year Commission</div>
                            <div className="detail">On every policy sold</div>
                        </div>
                        <div className="income-card">
                            <div className="amount">5-7.5%</div>
                            <div className="label">Renewal Commission</div>
                            <div className="detail">Lifetime passive income</div>
                        </div>
                    </div>
                </section>

                {/* === JOINING STEPS === */}
                <section className="apply-section">
                    <h2><span className="icon">📋</span> How to Join — Step by Step</h2>
                    <ol className="steps-list">
                        <li>
                            <div>
                                <div className="step-title">Submit Application</div>
                                <div className="step-desc">Fill the form below with your name and mobile number</div>
                            </div>
                        </li>
                        <li>
                            <div>
                                <div className="step-title">WhatsApp Discussion</div>
                                <div className="step-desc">Our Development Officer will contact you for profile verification</div>
                            </div>
                        </li>
                        <li>
                            <div>
                                <div className="step-title">Exam Preparation</div>
                                <div className="step-desc">Free training material for IRDA Agent Exam (IC-38)</div>
                            </div>
                        </li>
                        <li>
                            <div>
                                <div className="step-title">IRDA Exam</div>
                                <div className="step-desc">Pass the IRDA exam to receive your Agent License</div>
                            </div>
                        </li>
                        <li>
                            <div>
                                <div className="step-title">Start Earning</div>
                                <div className="step-desc">Begin selling policies and earning commissions immediately</div>
                            </div>
                        </li>
                    </ol>
                </section>

                {/* === ELIGIBILITY === */}
                <section className="apply-section">
                    <h2><span className="icon">✅</span> Eligibility Criteria</h2>
                    <div className="eligibility-grid">
                        <div className="eligibility-item">
                            <span className="check">✓</span> Age: 18-70 years
                        </div>
                        <div className="eligibility-item">
                            <span className="check">✓</span> Education: 10th Pass minimum
                        </div>
                        <div className="eligibility-item">
                            <span className="check">✓</span> Indian Citizen
                        </div>
                        <div className="eligibility-item">
                            <span className="check">✓</span> No prior experience needed
                        </div>
                        <div className="eligibility-item">
                            <span className="check">✓</span> Both men and women
                        </div>
                        <div className="eligibility-item">
                            <span className="check">✓</span> Work from anywhere
                        </div>
                    </div>
                </section>

                {/* === DOCUMENTS REQUIRED === */}
                <section className="apply-section">
                    <h2><span className="icon">📄</span> Documents Required</h2>
                    <div className="docs-grid">
                        <div className="doc-item">📋 Aadhaar Card</div>
                        <div className="doc-item">📋 PAN Card</div>
                        <div className="doc-item">📋 10th Marksheet</div>
                        <div className="doc-item">📋 Passport Size Photo</div>
                        <div className="doc-item">📋 Bank Passbook</div>
                        <div className="doc-item">📋 Mobile Number (Aadhaar linked)</div>
                    </div>
                </section>

                {/* === TRUST SIGNALS === */}
                <section className="apply-section" style={{ textAlign: 'center' }}>
                    <h2 style={{ justifyContent: 'center' }}><span className="icon">🛡️</span> Why Trust This Opportunity?</h2>
                    <div className="trust-bar">
                        <div className="trust-badge">🏛️ Government of India Enterprise</div>
                        <div className="trust-badge">📜 67+ Years Legacy</div>
                        <div className="trust-badge">🇮🇳 30 Crore+ Policyholders</div>
                        <div className="trust-badge">💼 13 Lakh+ Agents Nationwide</div>
                        <div className="trust-badge">✅ IRDA Regulated</div>
                    </div>
                </section>

                {/* === APPLICATION FORM === */}
                <section className="apply-form-section" id="apply-form">
                    <h2>📝 Apply Now — It&apos;s Free</h2>

                    {status.success ? (
                        <div className="form-success">
                            <h3>✅ Application Submitted!</h3>
                            <p>Redirecting to next steps...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="apply-name">Full Name</label>
                                <input
                                    id="apply-name"
                                    name="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Aapka Naam"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="apply-mobile">Mobile Number</label>
                                <input
                                    id="apply-mobile"
                                    name="mobile"
                                    type="tel"
                                    required
                                    maxLength={10}
                                    value={formData.mobile}
                                    onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                                    placeholder="10-digit mobile number"
                                />
                            </div>

                            {refCode && (
                                <div className="form-group">
                                    <label>Referred By (Code)</label>
                                    <input type="text" disabled value={refCode} />
                                </div>
                            )}

                            {status.error && (
                                <div className="form-error">{status.error}</div>
                            )}

                            <button
                                type="submit"
                                disabled={status.loading}
                                className="apply-submit-btn"
                            >
                                {status.loading ? 'Submitting...' : '🚀 Submit Application — Free'}
                            </button>
                        </form>
                    )}
                </section>

                {/* === WhatsApp CTA === */}
                <a
                    href={whatsappUrl}
                    className="whatsapp-cta"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                        window.dataLayer?.push({
                            event: 'apply_whatsapp_click',
                            source: 'apply_page'
                        });
                    }}
                >
                    💬 Have Questions? Chat on WhatsApp
                </a>

            </div>
        </div>
    );
}
