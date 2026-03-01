'use client';

import { useState } from "react";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import "@/styles/Contact.css";

const ContactContent = () => {

    const [formData, setFormData] = useState({
        name: "",
        mobile: "",
        email: "",
        reason: "",
        message: ""
    });

    const [status, setStatus] = useState({
        loading: false,
        error: null
    });

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status.loading) return;
        setStatus({ loading: true, error: null });

        try {
            const response = await fetch("/api/crm/create-contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    source: "Contact Page",
                    pipeline: "Recruitment",
                    tag: "Contact Inquiry"
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Submission failed");
            }

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: "contact_form_submit_success",
                contact_id: data.contact_id || "unknown",
                reason: formData.reason
            });

            const whatsappUrl = getWhatsAppUrl({
                name: formData.name,
                source: "Contact Page",
                intent: "Contact Follow-up",
                category: formData.reason || "General Inquiry"
            });

            window.location.href = whatsappUrl;

        } catch (error) {
            console.error(error);
            setStatus({
                loading: false,
                error: "Something went wrong. Please try again."
            });
        }
    };

    return (
        <div className="contact-container">

            {/* HERO */}
            <section className="contact-hero">
                <h1>Let's Connect</h1>
                <p>
                    Whether you need career clarity, exam support, or onboarding guidance —
                    our team is here to assist you.
                </p>
            </section>

            {/* CONTACT FORM */}
            <section className="contact-form-section">
                <form onSubmit={handleSubmit} className="contact-form">
                    <input type="text" name="name" placeholder="Your Full Name" required value={formData.name} onChange={handleChange} />
                    <input type="phone" name="phone" placeholder="Your Mobile Number" required value={formData.phone} onChange={handleChange} />
                    <input type="email" name="email" placeholder="Your Email Address" required value={formData.email} onChange={handleChange} />

                    <select name="reason" required value={formData.reason} onChange={handleChange}>
                        <option value="">Select Reason</option>
                        <option value="Career Guidance">Career Guidance</option>
                        <option value="IC-38 Exam Support">IC-38 Exam Support</option>
                        <option value="Documentation Help">Documentation Help</option>
                        <option value="General Inquiry">General Inquiry</option>
                    </select>

                    <textarea name="message" placeholder="Write your message..." required rows="5" value={formData.message} onChange={handleChange} />

                    {status.error && (
                        <div className="form-error">{status.error}</div>
                    )}

                    <button type="submit" disabled={status.loading}>
                        {status.loading ? "Submitting..." : "Send Message"}
                    </button>
                </form>
            </section>

            {/* OFFICE INFO */}
            <section className="office-section">
                <h2>Our Locations</h2>
                <div className="office-grid">
                    <div className="office-card">
                        <h3>Bima Sakhi Office</h3>
                        <a href="https://maps.app.goo.gl/T5Sb4a6962Xkiya8A" target="_blank" rel="noopener noreferrer">
                            View on Google Maps
                        </a>
                    </div>
                    <div className="office-card">
                        <h3>Branch Office</h3>
                        <a href="https://maps.app.goo.gl/NtTeB6VSMcUFFH3G9" target="_blank" rel="noopener noreferrer">
                            View on Google Maps
                        </a>
                    </div>
                </div>
                <div className="working-hours">
                    <p><strong>Office Hours:</strong> 10:00 AM – 5:30 PM</p>
                    <p><strong>Digital Support:</strong> 24/7 via Website & WhatsApp</p>
                </div>
            </section>

        </div>
    );
};

export default ContactContent;
