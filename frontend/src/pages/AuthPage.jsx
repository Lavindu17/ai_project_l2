import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import client from '../api/client';

const AuthPage = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('member'); // 'member' or 'leader'

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // LOGIN FLOW
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                // Sync with backend session
                await client.post('/api/auth/login', {
                    access_token: data.session.access_token,
                    user: data.user
                });

                // Get profile to redirect correctly
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();

                if (profile?.role === 'leader') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/member/dashboard');
                }

            } else {
                // SIGNUP FLOW
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: role
                        }
                    }
                });

                if (error) throw error;

                // Auto login after signup if session exists (Supabase sometimes auto-confirms)
                if (data.session) {
                    await client.post('/api/auth/login', {
                        access_token: data.session.access_token,
                        user: data.user
                    });

                    if (role === 'leader') {
                        navigate('/admin/dashboard');
                    } else {
                        navigate('/member/dashboard');
                    }
                } else {
                    alert('Registration successful! Please check your email to confirm.');
                    setIsLogin(true);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container" style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h2 style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p style={styles.subtitle}>
                        {isLogin ? 'Sign in to access your dashboard' : 'Join your team for better retrospectives'}
                    </p>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleAuth} style={styles.form}>
                    {!isLogin && (
                        <>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    style={styles.input}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>I am a...</label>
                                <div style={styles.roleToggle}>
                                    <button
                                        type="button"
                                        onClick={() => setRole('member')}
                                        style={role === 'member' ? styles.roleActive : styles.roleInactive}
                                    >
                                        Team Member
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('leader')}
                                        style={role === 'leader' ? styles.roleActive : styles.roleInactive}
                                    >
                                        Team Leader
                                    </button>
                                </div>
                                <p style={styles.roleHint}>
                                    {role === 'leader'
                                        ? 'Can create projects and sprints'
                                        : 'Can join retrospectives and view history'}
                                </p>
                            </div>
                        </>
                    )}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            placeholder="you@company.com"
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" style={styles.submitButton} disabled={loading}>
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div style={styles.footer}>
                    <p>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            style={styles.linkButton}
                        >
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
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
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: '20px'
    },
    card: {
        background: 'white',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '480px'
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px'
    },
    title: {
        fontSize: '32px',
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
        transition: 'all 0.2s'
    },
    roleToggle: {
        display: 'flex',
        gap: '10px',
        background: '#f7fafc',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0'
    },
    roleActive: {
        flex: 1,
        padding: '8px',
        borderRadius: '8px',
        background: 'white',
        border: 'none',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        color: '#4299e1',
        fontWeight: '600',
        cursor: 'default'
    },
    roleInactive: {
        flex: 1,
        padding: '8px',
        borderRadius: '8px',
        background: 'transparent',
        border: 'none',
        color: '#718096',
        cursor: 'pointer'
    },
    roleHint: {
        fontSize: '12px',
        color: '#718096',
        marginTop: '4px'
    },
    submitButton: {
        marginTop: '10px',
        padding: '14px',
        borderRadius: '10px',
        border: 'none',
        background: '#4299e1',
        color: 'white',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s'
    },
    error: {
        background: '#fff5f5',
        color: '#c53030',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px',
        textAlign: 'center'
    },
    footer: {
        marginTop: '30px',
        textAlign: 'center',
        color: '#718096',
        fontSize: '14px'
    },
    linkButton: {
        background: 'none',
        border: 'none',
        color: '#4299e1',
        fontWeight: '600',
        cursor: 'pointer',
        padding: 0
    }
};

export default AuthPage;
