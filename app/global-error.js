'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
    useEffect(() => {
        // Log the error natively to avoid bundling Node-only isomorphic modules
        console.error('GlobalErrorBoundary:', error.message, error.stack);
    }, [error]);

    return (
        <html>
            <body>
                <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
                    <h1>Something went wrong!</h1>
                    <p>A fatal system error has occurred. Support has been notified.</p>
                    <button
                        onClick={() => reset()}
                        style={{ padding: '0.5rem 1rem', marginTop: '1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Try again
                    </button>
                    {/* Security: Intentionally omitting stack trace from UI */}
                </div>
            </body>
        </html>
    );
}
