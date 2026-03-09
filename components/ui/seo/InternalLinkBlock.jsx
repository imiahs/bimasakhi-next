"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function InternalLinkBlock({ pageIndexId, localityId, cityId }) {
    const [links, setLinks] = useState([]);

    useEffect(() => {
        // Hydrate related localities for organic interlinking
        async function fetchGraph() {
            if (!localityId || !cityId) return;
            try {
                const queryParams = new URLSearchParams({ localityId, cityId, pageIndexId: pageIndexId || '' });
                const res = await fetch(`/api/events/internal-graph?${queryParams}`);
                if (res.ok) {
                    const data = await res.json();
                    setLinks(data.links || []);
                }
            } catch (e) {
                console.error("Link graph error", e);
            }
        }
        fetchGraph();
    }, [localityId, cityId, pageIndexId]);

    if (!links || links.length === 0) return null;

    return (
        <div className="internal-link-block" style={{ padding: '2rem 0', marginTop: '3rem', borderTop: '1px solid #eaeaea' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#333' }}>Explore Related Opportunities</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {links.map((link, i) => (
                    <li key={i}>
                        <Link href={`/${link.slug}`} style={{ textDecoration: 'none', color: '#0070f3', fontSize: '0.95rem' }}>
                            {link.anchor}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
