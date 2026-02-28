'use client';

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import "@/styles/ThankYou.css";

// Inner component that uses useSearchParams (must be inside Suspense)
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
    }, [referenceId, waitlist]);

    // Structured WhatsApp Link
    const whatsappUrl = getWhatsAppUrl({
        name: userName,
        leadId: referenceId,
        source: "ThankYou Page",
        waitlist: waitlist,
        category: waitlist ? "Expansion Waitlist" : "Direct Application",
        intent: "Ready to Proceed"
    });

    // Scroll Tracking (50% & 80%)
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;

            if (scrollPercent > 50 && !window.thankyou50Tracked) {
                window.dataLayer.push({ event: "thankyou_scroll_50" });
                window.thankyou50Tracked = true;
            }

            if (scrollPercent > 80 && !window.thankyou80Tracked) {
                window.dataLayer.push({ event: "thankyou_scroll_80" });
                window.thankyou80Tracked = true;
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="thankyou-container">

            {/* HERO CONFIRMATION */}
            <section className="thankyou-hero">
                <h1>
                    {waitlist
                        ? "🌍 You're on Our Expansion Priority List"
                        : "✅ Application Successfully Received"}
                </h1>

                {userName && (
                    <p className="personal-message">
                        {userName}, aapne ek powerful decision liya hai 👏
                    </p>
                )}

                {referenceId && (
                    <p className="reference-id">
                        <strong>Reference ID:</strong> {referenceId}
                    </p>
                )}

                <p>
                    {waitlist
                        ? "Aapka profile expansion priority list mein add kar diya gaya hai. Jab aapke area mein onboarding shuru hoga, hum turant inform karenge."
                        : "Aapka profile review ke liye bhej diya gaya hai. Personal WhatsApp discussion ke liye connect karein."}
                </p>

                <p style={{ marginTop: "15px", fontSize: "0.9em", color: "#555", textAlign: "center" }}>
                    Please send the pre-filled message so we can verify your application faster.
                </p>

                <a
                    href={whatsappUrl}
                    className="btn-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                        window.dataLayer.push({
                            event: "thankyou_whatsapp_click",
                            reference_id: referenceId || "no_id",
                            category: waitlist ? "waitlist" : "direct",
                            source: "thankyou_page"
                        });
                    }}
                >
                    Confirm & Continue on WhatsApp
                </a>
            </section>

            {/* WHAT HAPPENS NEXT */}
            <section className="thankyou-timeline">
                <h2>What Happens Next?</h2>
                <ol>
                    <li>✔ Application Verification</li>
                    <li>✔ Personal WhatsApp Discussion</li>
                    <li>✔ Training & Onboarding Guidance</li>
                </ol>
            </section>

            {/* KNOWLEDGE BOOSTER */}
            <section className="thankyou-knowledge">
                <h2>While You Wait, Know More</h2>
                <div className="knowledge-links">
                    <Link
                        href="/income"
                        onClick={() => window.dataLayer.push({ event: "thankyou_internal_income_click" })}
                    >
                        Income Model Kaise Kaam Karta Hai?
                    </Link>
                    <Link
                        href="/eligibility"
                        onClick={() => window.dataLayer.push({ event: "thankyou_internal_eligibility_click" })}
                    >
                        Eligibility Criteria
                    </Link>
                    <Link
                        href="/why"
                        onClick={() => window.dataLayer.push({ event: "thankyou_internal_why_click" })}
                    >
                        Why Join Bima Sakhi?
                    </Link>
                </div>
            </section>

            {/* OBJECTION FIREWALL */}
            <section className="thankyou-faq">
                <h2>Common Questions</h2>
                <details>
                    <summary>Kya joining fee hai?</summary>
                    <p>Nahi. LIC agency commission-based system hai. Hidden charges nahi hote.</p>
                </details>
                <details>
                    <summary>Income kitni realistic hai?</summary>
                    <p>Income performance based hoti hai. Detailed breakdown income page me diya gaya hai.</p>
                </details>
                <details>
                    <summary>Kya ghar se kaam kar sakte hain?</summary>
                    <p>Yes, flexible working model available hai.</p>
                </details>
            </section>

        </div>
    );
}

// Wrapper with Suspense boundary (required for useSearchParams in Next.js App Router)
export default function ThankYouContent() {
    return (
        <Suspense fallback={<div className="container py-8 text-center">Loading...</div>}>
            <ThankYouInner />
        </Suspense>
    );
}
