import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="app-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 'var(--space-4)',
            background: 'var(--bg-secondary)'
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '480px',
                background: 'var(--bg-primary)',
                padding: 'var(--space-10) var(--space-8)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)'
            }}>
                {/* Icon */}
                <div style={{
                    fontSize: '4rem',
                    marginBottom: 'var(--space-4)'
                }}>
                    🚀
                </div>

                <h1 style={{
                    marginBottom: 'var(--space-3)',
                    background: 'linear-gradient(135deg, var(--system-blue), var(--system-indigo))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    Sprint Retrospective AI
                </h1>

                <p className="body-text" style={{
                    color: 'var(--label-secondary)',
                    marginBottom: 'var(--space-8)',
                    lineHeight: 'var(--leading-relaxed)'
                }}>
                    Streamline your agile retrospectives with AI-powered insights and actionable recommendations.
                </p>

                <Link
                    to="/login"
                    className="btn-primary"
                    style={{
                        width: '100%',
                        maxWidth: '280px'
                    }}
                >
                    Login / Sign Up
                </Link>

                <p className="caption" style={{
                    marginTop: 'var(--space-4)'
                }}>
                    Join your team or lead a new one
                </p>
            </div>
        </div>
    );
};

export default Home;
