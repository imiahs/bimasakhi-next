'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const VisitorCounter = () => {
    const [views, setViews] = useState(null);
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname) return;

        // Normalize pathname for Redis key
        const page = pathname === '/' ? 'home' : pathname.replace(/^\//, '');

        // Increment and fetch count
        fetch('/api/analytics/page-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page })
        })
            .then(res => res.json())
            .then(data => {
                if (data.views) setViews(data.views);
            })
            .catch(() => {
                // Silently fail — counter is non-critical
            });
    }, [pathname]);

    if (views === null) return null;

    return (
        <div className="visitor-counter">
            👁️ <strong>{views.toLocaleString('en-IN')}</strong> visits to this page
        </div>
    );
};

export default VisitorCounter;
