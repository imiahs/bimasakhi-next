'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import './Login.css';

const LoginContent = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            let response;
            try { response = await res.json(); } catch(e) { response = {}; }

            if (!res.ok || (response && response.error) || response.success === false) {
                setError(response?.error || 'Invalid credentials. Please try again.');
                setLoading(false);
            } else {
                router.push('/admin');
            }
        } catch (err) {
            setError('System error. Please contact technical support.');
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-wrapper">
            <div className="login-card">
                <div className="login-brand">🔥</div>
                <h1>Bima Sakhi OS</h1>
                <p>Enter your credentials to access the master admin panel.</p>

                {error && <div className="login-error">{error}</div>}

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Admin Email</label>
                        <input
                            type="email"
                            required
                            placeholder="you@bimasakhi.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginContent;
