import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, LogOut, PlayCircle, Clock } from 'lucide-react';
import client from '../api/client';
import { supabase } from '../lib/supabase';

const MemberDashboard = () => {
    const navigate = useNavigate();
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        checkUser();
        fetchSprints();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/login');
            return;
        }
        setUser(user);
    };

    const fetchSprints = async () => {
        try {
            const response = await client.get('/api/sprint/my-sprints');
            setSprints(response.data.sprints || []);
        } catch (error) {
            console.error('Error fetching sprints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        await client.post('/api/auth/logout');
        navigate('/login');
    };

    const handleStartRetro = async (sprintId) => {
        try {
            const response = await client.post('/api/chat/start-session', { sprint_id: sprintId });
            if (response.data.success) {
                // Navigate to chat with session initialized
                navigate('/chat/session', {
                    state: {
                        member: response.data.member,
                        sprint: sprints.find(s => s.id === sprintId),
                        history: response.data.history,
                        submitted: response.data.member?.has_submitted,
                        restored: response.data.restored
                    }
                });
            }
        } catch (error) {
            alert('Failed to start session: ' + (error.response?.data?.error || error.message));
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    if (loading) return <div style={styles.loading}>Loading your sprints...</div>;

    const activeSprints = sprints.filter(s => ['active', 'collecting'].includes(s.status));
    const pastSprints = sprints.filter(s => !['active', 'collecting'].includes(s.status));

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.title}>My Retrospectives</h1>
                    <p style={styles.subtitle}>Welcome, {user?.user_metadata?.full_name || user?.email}</p>
                </div>
                <button onClick={handleLogout} style={styles.logoutButton}>
                    <LogOut size={16} style={{ marginRight: '6px' }} /> Sign Out
                </button>
            </header>

            <main style={styles.main}>
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>Active Sprints</h2>
                    {activeSprints.length === 0 ? (
                        <p style={styles.emptyText}>No active sprints requiring your feedback.</p>
                    ) : (
                        <div style={styles.grid}>
                            {activeSprints.map(sprint => (
                                <div key={sprint.id} style={styles.card}>
                                    <div style={styles.cardHeader}>
                                        <h3 style={styles.cardTitle}>{sprint.name}</h3>
                                        <span style={styles.badgeActive}>Active</span>
                                    </div>
                                    <div style={styles.cardMeta}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {formatDate(sprint.end_date)}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> {sprint.team_size || '0'} members</span>
                                    </div>
                                    <button
                                        onClick={() => handleStartRetro(sprint.id)}
                                        style={styles.actionButton}
                                    >
                                        <PlayCircle size={16} style={{ marginRight: '6px' }} /> Start Retrospective
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {pastSprints.length > 0 && (
                    <section style={styles.section}>
                        <h2 style={styles.sectionTitle}>Past Sprints</h2>
                        <div style={styles.grid}>
                            {pastSprints.map(sprint => (
                                <div key={sprint.id} style={{ ...styles.card, opacity: 0.8 }}>
                                    <div style={styles.cardHeader}>
                                        <h3 style={styles.cardTitle}>{sprint.name}</h3>
                                        <span style={styles.badgeClosed}>{sprint.status}</span>
                                    </div>
                                    <div style={styles.cardMeta}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Ended {formatDate(sprint.end_date)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', // Match AuthPage
        padding: '30px'
    },
    loading: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#718096'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        maxWidth: '1000px',
        margin: '0 auto 40px'
    },
    title: {
        color: '#1a202c',
        marginBottom: '5px',
        fontSize: '32px',
        fontWeight: '800'
    },
    subtitle: {
        color: '#718096',
        fontSize: '16px'
    },
    logoutButton: {
        padding: '10px 18px',
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        color: '#4a5568',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    main: {
        maxWidth: '1000px',
        margin: '0 auto'
    },
    section: {
        marginBottom: '40px'
    },
    sectionTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#2d3748',
        marginBottom: '20px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '10px'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
    },
    card: {
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#2d3748',
        margin: 0
    },
    cardMeta: {
        display: 'flex',
        gap: '15px',
        color: '#718096',
        fontSize: '13px',
        marginBottom: '20px'
    },
    badgeActive: {
        padding: '5px 12px',
        background: '#ebf8ff', // Light Blue
        color: '#4299e1',     // Flat Blue
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
        textTransform: 'uppercase'
    },
    badgeClosed: {
        padding: '5px 12px',
        background: '#edf2f7',
        color: '#718096',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    actionButton: {
        width: '100%',
        padding: '12px',
        background: '#4299e1', // Flat Blue
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s',
        boxShadow: '0 2px 4px rgba(66, 153, 225, 0.3)'
    },
    emptyText: {
        color: '#718096',
        fontStyle: 'italic',
        background: 'rgba(255,255,255,0.5)',
        padding: '20px',
        borderRadius: '10px',
        textAlign: 'center'
    }
};

export default MemberDashboard;
