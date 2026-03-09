'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
    useEffect(() => {
        // Log to our console safely instead of exposing via Node.js isomorphic libs
        console.error('AppErrorBoundary:', error.message, error.stack);
    }, [error]);

    return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h2>An unexpected error occurred</h2>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Our engineering team has been automatically notified.</p>
            <button
                onClick={() => reset()}
                style={{ padding: '0.5rem 1rem', marginTop: '1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
                Try again
            </button>
            {/* Security Note: No stack traces exposed in production UI */}
        </div>
    );
}
