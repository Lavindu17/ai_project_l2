import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
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
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <div style={styles.iconWrapper}>
                        <Lock size={40} color="#4299e1" />
                    </div>
                    <h2 style={styles.title}>Admin Login</h2>
                    <p style={styles.subtitle}>Enter your credentials to continue</p>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            style={styles.input}
                            required
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        style={styles.submitButton}
                        disabled={loading || !password}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={styles.footer}>
                    <Link to="/" style={styles.linkButton}>
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', // Match AuthPage
        padding: '20px'
    },
    card: {
        background: 'white',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px'
    },
    iconWrapper: {
        fontSize: '48px',
        marginBottom: '16px'
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#1a202c',
        marginBottom: '10px'
    },
    subtitle: {
        color: '#718096',
        fontSize: '16px'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#4a5568'
    },
    input: {
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        fontSize: '16px',
        transition: 'all 0.2s',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box'
    },
    submitButton: {
        marginTop: '10px',
        padding: '14px',
        borderRadius: '10px',
        border: 'none',
        background: '#4299e1', // Flat Blue
        color: 'white',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s',
        width: '100%'
    },
    error: {
        background: '#fff5f5',
        color: '#c53030',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px',
        textAlign: 'center',
        border: '1px solid #feb2b2'
    },
    footer: {
        marginTop: '30px',
        textAlign: 'center',
        paddingTop: '20px',
        borderTop: '1px solid #e2e8f0'
    },
    linkButton: {
        color: '#4299e1',
        fontWeight: '600',
        textDecoration: 'none',
        fontSize: '14px'
    }
};

export default AdminLogin;
