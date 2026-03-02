'use client';

import { useContext, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LanguageContext } from '../../context/LanguageContext';
import "../../styles/FloatingActions.css";

const FloatingApplyContent = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { language } = useContext(LanguageContext);

    // Detect source from URL
    const getSource = () => {
        return searchParams.get("source") || "direct";
    };

    const handleClick = (e) => {
        // Log for live troubleshooting
        console.log("Floating Apply Clicked", { source: getSource() });

        const source = getSource();

        // Google Tag Manager Event (Temporarily Disabled for debugging)
        /*
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "apply_click",
            source: source,
            location: "floating_button"
        });
        */

        // Ensure user lands at top of page
        window.scrollTo(0, 0);
    };

    const text = language === 'hi'
        ? 'अभी अप्लाई करें'
        : 'Apply Now';

    const source = getSource();

    return (
        <Link
            href={`/apply?source=${source}`}
            className="floating-pill apply-pill attention-pulse"
            onClick={handleClick}
            aria-label="Apply for Bima Sakhi Opportunity"
        >
            📝 {text}
        </Link>
    );
};

const FloatingApply = () => {
    return (
        <Suspense fallback={<div className="floating-pill apply-pill attention-pulse">📝 Apply Now</div>}>
            <FloatingApplyContent />
        </Suspense>
    );
};

export default FloatingApply;