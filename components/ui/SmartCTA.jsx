'use client';

import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { UserContext } from '@/context/UserContext';
import { analytics } from '@/services/analytics';

export default function SmartCTA({ defaultLabel = "Apply Now", defaultLink = "/apply" }) {
    const { userState } = useContext(UserContext);
    const [ctaTarget, setCtaTarget] = useState({
        label: defaultLabel,
        link: defaultLink,
        eventLabel: "smart_cta_default"
    });

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const res = await fetch('/api/ui/smart-cta');
                const { rules } = await res.json();

                if (!rules) return;

                // Evaluate rules based on userState
                // Prioritize 'used_calculator' -> 'ApplyCTA'
                // Prioritize 'read_blog' -> 'CalculatorCTA'
                for (const rule of rules) {
                    if (rule.condition_type === 'used_calculator') {
                        const usedCalc = userState.visitedPages.some(p => p.includes(rule.condition_value || '/tools'));
                        if (usedCalc && rule.cta_component === 'ApplyCTA') {
                            setCtaTarget({
                                label: "Proceed to Application",
                                link: "/apply",
                                eventLabel: "smart_cta_apply_from_calc"
                            });
                            return; // Stop applying rules
                        }
                    } else if (rule.condition_type === 'read_blog') {
                        const readBlog = userState.visitedPages.some(p => p.includes(rule.condition_value || '/blog'));
                        if (readBlog && rule.cta_component === 'CalculatorCTA') {
                            setCtaTarget({
                                label: "Calculate Your Potential Income",
                                link: "/tools/lic-income-calculator",
                                eventLabel: "smart_cta_calc_from_blog"
                            });
                            return; // Stop applying rules
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load Smart CTA rules", err);
            }
        };

        if (userState?.visitedPages?.length > 0) {
            fetchRules();
        }
    }, [userState]);

    const handleCtaClick = () => {
        analytics.track(ctaTarget.eventLabel, {
            clicked_link: ctaTarget.link
        });
    };

    return (
        <Link href={ctaTarget.link} onClick={handleCtaClick} className="btn btn-primary" style={{ display: 'inline-block', textAlign: 'center' }}>
            {ctaTarget.label}
        </Link>
    );
}
