'use client';

import React from 'react';
import { getWhatsAppUrl } from '../../utils/whatsapp'; // ← Central WhatsApp engine import
import "../../styles/FloatingActions.css";

const FloatingWhatsApp = () => {
    const [source, setSource] = React.useState("direct");

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setSource(params.get("source") || "direct");
        }
    }, []);

    const handleClick = (e) => {
        // GTM tracking (existing logic)
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "whatsapp_click",
            source: source,
            location: "floating_button",
            intent: "General Interest" // ← extra context for future segmentation
        });
    };

    // Use central function — yahaan name/email nahi hai to optional fields skip
    const whatsappURL = getWhatsAppUrl({
        source: source,
        intent: "General Interest",          // Floating button ka natural intent
        category: "Floating CTA Inquiry"     // Optional — future segmentation ke liye
    });

    return (
        <a
            href={whatsappURL}
            target="_blank"
            rel="noopener noreferrer"
            className="floating-pill whatsapp-pill"
            onClick={handleClick}
        >
            💬 WhatsApp
        </a>
    );
};

export default FloatingWhatsApp;