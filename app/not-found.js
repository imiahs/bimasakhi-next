import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>404</h1>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: '#555' }}>
                Page Not Found
            </h2>
            <p style={{ marginBottom: '32px', color: '#777' }}>
                The page you are looking for does not exist or has been moved.
            </p>
            <Link
                href="/"
                style={{
                    display: 'inline-block',
                    padding: '12px 32px',
                    backgroundColor: 'var(--primary-color, #e91e63)',
                    color: '#fff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                }}
            >
                Go to Home
            </Link>
        </div>
    );
}
