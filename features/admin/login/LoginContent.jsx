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

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Mock authentication check
        if (email === 'admin@bimasakhi.com' && password === 'bimasakhi2026') {
            // In a real app, this would set a secure HTTP-only cookie
            document.cookie = "admin-session=mock-token; path=/;";

            setTimeout(() => {
                router.push('/admin/dashboard');
            }, 800);
        } else {
            setTimeout(() => {
                setError('Invalid credentials. Please try again.');
                setLoading(false);
            }, 800);
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

                    <p className="text-sm text-gray-400 mt-6">(Hint: admin@bimasakhi.com / bimasakhi2026)</p>
                </form>
            </div>
        </div>
    );
};

export default LoginContent;
