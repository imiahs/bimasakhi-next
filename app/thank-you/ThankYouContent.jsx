'use client';

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import { analytics } from "@/services/analytics";
import "@/styles/ThankYou.css";

function ThankYouInner() {
    const searchParams = useSearchParams();

    const referenceId = searchParams.get("ref") || null;
    const nameParam = searchParams.get("name") || "Applicant";
    const waitlist = searchParams.get("waitlist") === "true";

    const [userName] = useState(nameParam);

    // GTM PAGE LOAD EVENT
    useEffect(() => {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "thankyou_page_loaded",
            reference_id: referenceId || "direct_visit",
            category: waitlist ? "waitlist" : "direct",
            source: "thankyou_page"
        });

        analytics.track("thankyou_page_view", {
            _event_type: "page_view",
            reference_id: referenceId || "direct_visit",
            category: waitlist ? "waitlist" : "direct"
        });
    }, [referenceId, waitlist]);

    const whatsappUrl = getWhatsAppUrl({
        name: userName,
        leadId: referenceId,
        source: "ThankYou Page",
        waitlist: waitlist,
        category: waitlist ? "Expansion Waitlist" : "Direct Application",
        intent: "Ready to Proceed"
    });

    // Scroll Tracking
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            if (docHeight <= 0) return;
            const scrollPercent = (scrollTop / docHeight) * 100;

            if (scrollPercent > 50 && !window.thankyou50Tracked) {
                window.dataLayer?.push({ event: "thankyou_scroll_50" });
                window.thankyou50Tracked = true;
            }
            if (scrollPercent > 80 && !window.thankyou80Tracked) {
                window.dataLayer?.push({ event: "thankyou_scroll_80" });
                window.thankyou80Tracked = true;
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="thankyou-page">

            {/* === WELCOME HERO === */}
            <section className="thankyou-hero">
                <span className="success-icon">🎉</span>
                <h1>
                    {waitlist
                        ? "You're on Our Expansion Priority List!"
                        : "Application Successfully Received!"}
                </h1>

                {userName && userName !== 'Applicant' && (
                    <p className="welcome-name">
                        {userName}, aapne ek powerful decision liya hai 👏
                    </p>
                )}

                {referenceId && (
                    <div className="reference-id">
                        <strong>Reference ID:</strong> {referenceId}
                    </div>
                )}

                <p className="team-name">🏆 Welcome to Team Utkarshan</p>
            </section>

            <div className="thankyou-content">

                {/* === WHATSAPP CTA (Primary) === */}
                <a
                    href={whatsappUrl}
                    className="cta-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                        window.dataLayer?.push({
                            event: "thankyou_whatsapp_click",
                            reference_id: referenceId || "no_id",
                            source: "thankyou_page"
                        });
                        analytics.track("thankyou_whatsapp_click", {
                            _event_type: "cta_clicked",
                            reference_id: referenceId || "no_id",
                            action: "whatsapp_confirm"
                        });
                    }}
                >
                    💬 Confirm & Continue on WhatsApp
                </a>
                <p style={{ textAlign: 'center', fontSize: '0.82em', color: '#64748b', marginTop: '8px' }}>
                    Please send the pre-filled message so we can verify your application faster.
                </p>

                {/* === NEXT STEPS TIMELINE === */}
                <section className="thankyou-section">
                    <h2>📋 What Happens Next?</h2>
                    <div className="timeline">
                        <div className="timeline-item">
                            <div className="step-name">✅ Application Received</div>
                            <div className="step-detail">Your profile has been submitted for review</div>
                            <div className="step-time">Just now</div>
                        </div>
                        <div className="timeline-item pending">
                            <div className="step-name">WhatsApp Verification</div>
                            <div className="step-detail">A Development Officer will contact you on WhatsApp</div>
                            <div className="step-time">Within 24 hours</div>
                        </div>
                        <div className="timeline-item pending">
                            <div className="step-name">Document Submission</div>
                            <div className="step-detail">Submit required documents for agent registration</div>
                            <div className="step-time">Within 3-5 days</div>
                        </div>
                        <div className="timeline-item pending">
                            <div className="step-name">Exam Preparation</div>
                            <div className="step-detail">Free study material for IRDA Agent Exam (IC-38)</div>
                            <div className="step-time">1-2 weeks</div>
                        </div>
                        <div className="timeline-item pending">
                            <div className="step-name">IRDA Exam & License</div>
                            <div className="step-detail">Pass the exam and receive your official agent license</div>
                            <div className="step-time">2-4 weeks</div>
                        </div>
                        <div className="timeline-item pending">
                            <div className="step-name">🚀 Start Earning</div>
                            <div className="step-detail">Begin selling policies with ₹7,000/month stipend + commissions</div>
                            <div className="step-time">After license</div>
                        </div>
                    </div>
                </section>

                {/* === DOCUMENT CHECKLIST === */}
                <section className="thankyou-section">
                    <h2>📄 Prepare These Documents</h2>
                    <p style={{ fontSize: '0.88em', color: '#64748b', marginBottom: '12px' }}>
                        Keep these ready before your office visit or WhatsApp verification:
                    </p>
                    <ul className="doc-checklist">
                        <li><span className="check-icon"></span> Aadhaar Card (original + photocopy)</li>
                        <li><span className="check-icon"></span> PAN Card (original + photocopy)</li>
                        <li><span className="check-icon"></span> 10th or 12th Class Marksheet</li>
                        <li><span className="check-icon"></span> 4 Passport Size Photographs</li>
                        <li><span className="check-icon"></span> Bank Passbook or Cancelled Cheque</li>
                        <li><span className="check-icon"></span> Mobile Number linked to Aadhaar</li>
                    </ul>
                </section>

                {/* === OFFICE VISIT INSTRUCTIONS === */}
                <section className="thankyou-section">
                    <h2>🏢 Office Visit Information</h2>
                    <div className="office-card">
                        <div className="office-title">When will I need to visit?</div>
                        <div className="office-detail">
                            After WhatsApp verification, your Development Officer will schedule an
                            office visit at the nearest LIC Branch. This is for document verification
                            and exam registration. The visit typically takes 30-45 minutes.
                        </div>
                    </div>
                </section>

                {/* === MOTIVATIONAL SECTION === */}
                <div className="motivation-section">
                    <p className="quote">
                        &ldquo;Safalta ka raasta mushkil zaroor hai, lekin aap sahi disha mein chal rahe hain.
                        Team Utkarshan mein aapka swagat hai!&rdquo;
                    </p>
                    <p className="author">— Team Utkarshan, LIC Development Office</p>
                </div>

                {/* === VIDEO PLACEHOLDER === */}
                <section className="thankyou-section">
                    <h2>🎥 Watch: Your Journey Ahead</h2>
                    <div className="video-placeholder">
                        🎬 Introduction video coming soon — Learn about your LIC agent journey
                    </div>
                </section>

                {/* === KNOWLEDGE BOOSTER === */}
                <section className="thankyou-section">
                    <h2>📚 While You Wait, Know More</h2>
                    <div className="knowledge-links">
                        <Link
                            href="/income"
                            onClick={() => window.dataLayer?.push({ event: "thankyou_internal_income_click" })}
                        >
                            💰 Income Model Kaise Kaam Karta Hai?
                        </Link>
                        <Link
                            href="/eligibility"
                            onClick={() => window.dataLayer?.push({ event: "thankyou_internal_eligibility_click" })}
                        >
                            ✅ Eligibility Criteria
                        </Link>
                        <Link
                            href="/why"
                            onClick={() => window.dataLayer?.push({ event: "thankyou_internal_why_click" })}
                        >
                            🌟 Why Join Bima Sakhi?
                        </Link>
                    </div>
                </section>

                {/* === FAQ SECTION === */}
                <section className="thankyou-section thankyou-faq">
                    <h2>❓ Common Questions</h2>
                    <details>
                        <summary>Kya joining fee hai?</summary>
                        <p>Nahi. LIC agency commission-based system hai. Hidden charges nahi hote.</p>
                    </details>
                    <details>
                        <summary>Income kitni realistic hai?</summary>
                        <p>Income performance based hoti hai. ₹7,000/month stipend guaranteed hai for Bima Sakhi. Commission income unlimited hai based on policies sold.</p>
                    </details>
                    <details>
                        <summary>Kya ghar se kaam kar sakte hain?</summary>
                        <p>Yes, flexible working model available hai. Client meetings field mein hote hain but baaki kaam remotely ho sakta hai.</p>
                    </details>
                    <details>
                        <summary>Exam kitna difficult hai?</summary>
                        <p>IC-38 exam basic level ka hai. Free study material provide kiya jata hai aur 90%+ aspirants pass karte hain.</p>
                    </details>
                </section>

                {/* === BOTTOM CTA === */}
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <a
                        href={whatsappUrl}
                        className="cta-primary"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex' }}
                    >
                        💬 Connect on WhatsApp Now
                    </a>
                    <div style={{ marginTop: '16px' }}>
                        <Link href="/" className="cta-secondary">
                            ← Return to Homepage
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function ThankYouContent() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
            <ThankYouInner />
        </Suspense>
    );
}
