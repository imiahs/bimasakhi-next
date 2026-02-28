'use client';

import { useEffect } from "react";
import "@/styles/About.css";

const AboutContent = () => {

    useEffect(() => {
        const sections = document.querySelectorAll(".reveal");
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("active");
                    }
                });
            },
            { threshold: 0.15 }
        );

        sections.forEach((section) => observer.observe(section));
        return () => observer.disconnect();
    }, []);

    return (
        <div className="about-container">

            {/* HERO */}
            <section className="about-hero reveal">
                <h1>Empowering Women Since 2013</h1>
                <p>
                    Bima Sakhi is an independent guidance platform initiated by
                    <strong> Raj Kumar, Development Officer (since 2013)</strong>,
                    dedicated to building structured and transparent LIC agency careers for women.
                </p>
                <div className="experience-badge">
                    10+ Years of Industry Experience
                </div>
            </section>

            {/* FOUNDER */}
            <section className="founder-section reveal">
                <div className="founder-grid">
                    <div className="founder-image">
                        <img src="/images/home/mentor-profile.jpg" alt="Raj Kumar Development Officer" />
                    </div>
                    <div className="founder-content">
                        <h2>Meet Raj Kumar</h2>
                        <p>
                            Since 2013, I have worked closely with aspiring agents,
                            guiding them through registration, IC-38 training, URN generation,
                            examination, and post-certification business development.
                        </p>
                        <p>
                            Over time, I realized that women often hesitate due to lack of clarity
                            about documentation, exam preparation, and onboarding structure.
                            Bima Sakhi was created to eliminate that confusion.
                        </p>
                        <div className="legal-note">
                            This platform provides independent career guidance and is not the official LIC website.
                        </div>
                    </div>
                </div>
            </section>

            {/* JOURNEY */}
            <section className="journey-section reveal">
                <h2>The Structured Agent Journey</h2>
                <div className="timeline">
                    <div>Application & Document Collection</div>
                    <div>25-Hour IC-38 Training</div>
                    <div>Document Upload & URN Generation</div>
                    <div>Exam Fee & Slot Booking</div>
                    <div>IC-38 Exam Qualification</div>
                    <div>Product Training & Business Launch</div>
                </div>
            </section>

            {/* OFFICE */}
            <section className="office-section reveal">
                <h2>Visit Our Office</h2>
                <div className="office-grid">
                    <div className="office-info">
                        <p><strong>Raj Kumar – Development Officer</strong></p>
                        <p>Delhi NCR</p>
                        <p><strong>Working Hours (Office):</strong><br />10:00 AM – 5:30 PM</p>
                        <p><strong>Digital Support:</strong><br />Available 24/7 via Online Platform</p>
                        <a
                            href="https://maps.app.goo.gl/NtTeB6VSMcUFFH3G9"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="map-btn"
                        >
                            Open in Google Maps
                        </a>
                    </div>
                    <div className="map-embed">
                        <iframe
                            src="https://www.google.com/maps?q=Delhi+NCR&output=embed"
                            width="100%"
                            height="300"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            title="Office Location"
                        ></iframe>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="about-cta reveal">
                <h2>Ready to Begin Your Journey?</h2>
                <a href="/apply" className="cta-btn">
                    Apply for Bima Sakhi Opportunity
                </a>
            </section>

        </div>
    );
};

export default AboutContent;
