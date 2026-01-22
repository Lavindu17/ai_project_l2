import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

const AdminLogin = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await client.post('/api/admin/login', { password });
            if (response.data.success) {
                navigate('/admin/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 'var(--space-4)',
            background: 'var(--bg-secondary)'
        }}>
            <div className="modal-content" style={{
                width: '100%',
                maxWidth: '400px',
                margin: '0'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                    <div style={{
                        fontSize: '3rem',
                        marginBottom: 'var(--space-3)'
                    }}>
                        🔐
                    </div>
                    <h2>Admin Login</h2>
                    <p className="caption" style={{ marginTop: 'var(--space-2)' }}>
                        Enter your credentials to continue
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        background: 'rgba(255, 59, 48, 0.1)',
                        color: 'var(--system-red)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-4)',
                        fontSize: 'var(--text-sm)',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            required
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading || !password}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                                <span className="loading-spinner" style={{ width: '18px', height: '18px' }}></span>
                                Signing in...
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Back Link */}
                <div style={{
                    textAlign: 'center',
                    marginTop: 'var(--space-6)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--separator)'
                }}>
                    <Link
                        to="/"
                        style={{
                            color: 'var(--system-blue)',
                            textDecoration: 'none',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--font-medium)'
                        }}
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
