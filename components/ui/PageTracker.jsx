'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTracker({ pageId }) {
    const pathname = usePathname();

    useEffect(() => {
        if (!pageId) return;

        let maxScroll = 0;

        const handleScroll = () => {
            const depth = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            if (depth > maxScroll) maxScroll = depth;
        };

        const interceptClicks = (e) => {
            const target = e.target.closest('a, button');
            if (target && target.innerText) {
                const text = target.innerText.toLowerCase();
                // Naive assumption evaluating common CTA lexicons
                if (text.includes('apply') || text.includes('join') || text.includes('calculate')) {
                    navigator.sendBeacon('/api/events/page-metrics', JSON.stringify({ page_id: pageId, action: 'cta_click' }));
                }
                if (text.includes('submit')) {
                    navigator.sendBeacon('/api/events/page-metrics', JSON.stringify({ page_id: pageId, action: 'form_submission' }));
                }
            }
        };

        // Attach listeners
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('click', interceptClicks);

        // Log Initial Page View
        fetch('/api/events/page-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page_id: pageId, action: 'page_view', scroll_depth: 0 })
        }).catch(() => { });

        return () => {
            // On unmount, record the max scroll depth attached to another page_view payload update asynchronously
            navigator.sendBeacon('/api/events/page-metrics', JSON.stringify({ page_id: pageId, action: 'page_view', scroll_depth: maxScroll }));
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('click', interceptClicks);
        };
    }, [pageId, pathname]);

    return null; // Headless component providing telemetry 
}
