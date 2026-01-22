import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import client from '../api/client';
import '../styles/dashboard.css';

const AdminDashboard = () => {
    const location = useLocation();
    const [sprints, setSprints] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('sprints');
    const [expandedSprint, setExpandedSprint] = useState(null);
    const [inviteLinks, setInviteLinks] = useState({});
    const [notification, setNotification] = useState(location.state?.message || '');

    useEffect(() => {
        fetchData();
        if (notification) {
            setTimeout(() => setNotification(''), 3000);
        }
    }, []);

    const fetchData = async () => {
        try {
            const [sprintsRes, projectsRes] = await Promise.all([
                client.get('/api/admin/dashboard'),
                client.get('/api/project/list')
            ]);
            setSprints(sprintsRes.data.sprints || []);
            setProjects(projectsRes.data.projects || []);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await client.post('/api/admin/logout');
        window.location.href = '/admin/login';
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'collecting': return styles.statusCollecting;
            case 'analyzing': return styles.statusAnalyzing;
            case 'analyzed': return styles.statusAnalyzed;
            case 'closed': return styles.statusClosed;
            default: return {};
        }
    };

    const handleViewInvites = async (sprintId) => {
        if (expandedSprint === sprintId) {
            setExpandedSprint(null);
            return;
        }

        try {
            const response = await client.get(`/api/sprint/${sprintId}/members`);
            setInviteLinks(prev => ({
                ...prev,
                [sprintId]: response.data.members
            }));
            setExpandedSprint(sprintId);
        } catch (error) {
            console.error('Failed to get team members', error);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setNotification('Copied to clipboard!');
        setTimeout(() => setNotification(''), 2000);
    };

    return (
        <div style={styles.pageContainer}>
            {notification && (
                <div style={styles.notification}>{notification}</div>
            )}

            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <h1 style={styles.headerTitle}>Sprint Dashboard</h1>
                    <p style={styles.headerSubtitle}>Manage your retrospectives</p>
                </div>
                <div style={styles.headerActions}>
                    <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
                    <Link to="/admin/project/create" style={styles.secondaryButton}>
                        + Project
                    </Link>
                    <Link to="/admin/sprint/create" style={styles.primaryButton}>
                        + New Sprint
                    </Link>
                </div>
            </header>

            {/* Tab Navigation */}
            <div style={styles.tabContainer}>
                <button
                    style={activeTab === 'sprints' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('sprints')}
                >
                    🏃 Sprints ({sprints.length})
                </button>
                <button
                    style={activeTab === 'projects' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('projects')}
                >
                    📁 Projects ({projects.length})
                </button>
            </div>

            {loading ? (
                <div style={styles.loadingContainer}>
                    <div className="loading-spinner"></div>
                    <p style={styles.loadingText}>Loading...</p>
                </div>
            ) : activeTab === 'sprints' ? (
                <div style={styles.grid}>
                    {sprints.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>🏃</div>
                            <h3 style={styles.emptyTitle}>No sprints yet</h3>
                            <p style={styles.emptyText}>Create your first sprint to get started</p>
                            <Link to="/admin/sprint/create" style={styles.emptyButton}>
                                Create Sprint
                            </Link>
                        </div>
                    ) : (
                        sprints.map(sprint => (
                            <div key={sprint.id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <h3 style={styles.cardTitle}>{sprint.name}</h3>
                                    <span style={{ ...styles.statusBadge, ...getStatusStyle(sprint.status) }}>
                                        {sprint.status}
                                    </span>
                                </div>

                                <div style={styles.cardMeta}>
                                    <span style={styles.dateRange}>📅 {sprint.start_date} → {sprint.end_date}</span>
                                    <span style={styles.teamSize}>👥 {sprint.team_size || 0} members</span>
                                </div>

                                <div style={styles.cardActions}>
                                    <button
                                        onClick={() => handleViewInvites(sprint.id)}
                                        style={styles.inviteButton}
                                    >
                                        {expandedSprint === sprint.id ? '✕ Hide' : '👥 View Team'}
                                    </button>

                                    {sprint.status === 'analyzed' && (
                                        <Link to={`/admin/sprint/${sprint.id}/report`} style={styles.reportButton}>
                                            📊 Report
                                        </Link>
                                    )}
                                </div>

                                {/* Expanded team view */}
                                {expandedSprint === sprint.id && inviteLinks[sprint.id] && (
                                    <div style={styles.inviteSection}>
                                        <h4 style={styles.inviteTitle}>Team Members</h4>
                                        {inviteLinks[sprint.id].length === 0 ? (
                                            <p style={styles.noMembers}>No team members added yet.</p>
                                        ) : (
                                            inviteLinks[sprint.id].map((member, idx) => (
                                                <div key={idx} style={styles.memberRow}>
                                                    <div style={styles.memberInfo}>
                                                        <span style={styles.memberName}>{member.name}</span>
                                                        <span style={styles.memberRole}>{member.role}</span>
                                                        {member.email && <span style={styles.memberEmail}>{member.email}</span>}
                                                        {member.has_submitted && (
                                                            <span style={styles.submittedBadge}>✓ Submitted</span>
                                                        )}
                                                        {!member.has_submitted && (
                                                            <span style={styles.pendingBadge}>⏳ Pending</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* Projects Tab */
                <div style={styles.grid}>
                    {projects.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>📁</div>
                            <h3 style={styles.emptyTitle}>No projects yet</h3>
                            <p style={styles.emptyText}>Create a project to organize your sprints</p>
                            <Link to="/admin/project/create" style={styles.emptyButton}>
                                Create Project
                            </Link>
                        </div>
                    ) : (
                        projects.map(project => (
                            <div key={project.id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <h3 style={styles.cardTitle}>{project.name}</h3>
                                    <span style={styles.projectBadge}>Project</span>
                                </div>
                                {project.description && (
                                    <p style={styles.projectDescription}>{project.description}</p>
                                )}
                                <div style={styles.cardMeta}>
                                    <span style={styles.dateRange}>
                                        Created {new Date(project.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const styles = {
    pageContainer: {
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f0f4ff 0%, #fafbff 100%)',
        padding: '24px',
    },
    notification: {
        position: 'fixed',
        top: '24px',
        right: '24px',
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        color: 'white',
        padding: '14px 28px',
        borderRadius: '12px',
        zIndex: 1000,
        fontWeight: '600',
        boxShadow: '0 8px 25px rgba(17, 153, 142, 0.35)',
        fontSize: '14px',
    },
    header: {
        maxWidth: '1200px',
        margin: '0 auto 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {},
    headerTitle: {
        fontSize: '32px',
        fontWeight: '800',
        color: '#1a202c',
        marginBottom: '4px',
        letterSpacing: '-0.5px',
    },
    headerSubtitle: {
        fontSize: '16px',
        color: '#718096',
        margin: 0,
    },
    headerActions: {
        display: 'flex',
        gap: '12px',
    },
    logoutButton: {
        padding: '12px 20px',
        backgroundColor: 'white',
        color: '#4a5568',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    secondaryButton: {
        padding: '12px 20px',
        background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
        color: '#4a5568',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        textDecoration: 'none',
    },
    primaryButton: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        textDecoration: 'none',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.35)',
    },
    tabContainer: {
        maxWidth: '1200px',
        margin: '0 auto 24px',
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '16px',
    },
    tab: {
        padding: '12px 24px',
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '15px',
        fontWeight: '500',
        color: '#718096',
        cursor: 'pointer',
        borderRadius: '10px',
        transition: 'all 0.2s',
    },
    activeTab: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        fontSize: '15px',
        fontWeight: '600',
        color: 'white',
        cursor: 'pointer',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
    },
    loadingContainer: {
        textAlign: 'center',
        padding: '60px 20px',
    },
    loadingText: {
        color: '#718096',
        marginTop: '16px',
    },
    grid: {
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '20px',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '18px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '14px',
    },
    cardTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1a202c',
        margin: 0,
    },
    statusBadge: {
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    statusCollecting: {
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
        color: '#4c51bf',
    },
    statusAnalyzing: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        color: '#b45309',
    },
    statusAnalyzed: {
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        color: '#047857',
    },
    statusClosed: {
        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
        color: '#6b7280',
    },
    projectBadge: {
        padding: '6px 14px',
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        color: '#1d4ed8',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
    },
    cardMeta: {
        display: 'flex',
        gap: '16px',
        marginBottom: '18px',
    },
    dateRange: {
        fontSize: '13px',
        color: '#718096',
    },
    teamSize: {
        fontSize: '13px',
        color: '#718096',
    },
    cardActions: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
    },
    inviteButton: {
        padding: '10px 18px',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
        color: '#4c51bf',
        border: 'none',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    reportButton: {
        padding: '10px 18px',
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        color: 'white',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: '600',
        textDecoration: 'none',
    },
    inviteSection: {
        marginTop: '20px',
        padding: '18px',
        background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
        borderRadius: '14px',
        borderTop: '2px solid #e2e8f0',
    },
    inviteTitle: {
        fontSize: '14px',
        fontWeight: '700',
        marginBottom: '14px',
        color: '#2d3748',
    },
    noMembers: {
        color: '#718096',
        fontSize: '14px',
        fontStyle: 'italic',
    },
    memberRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #e2e8f0',
    },
    memberInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    memberName: {
        fontWeight: '600',
        fontSize: '14px',
        color: '#2d3748',
    },
    memberRole: {
        fontSize: '12px',
        color: '#5a67d8',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
        padding: '3px 10px',
        borderRadius: '12px',
        fontWeight: '500',
    },
    submittedBadge: {
        fontSize: '11px',
        color: '#047857',
        fontWeight: '600',
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        padding: '3px 10px',
        borderRadius: '12px',
    },
    pendingBadge: {
        fontSize: '11px',
        color: '#b45309',
        fontWeight: '600',
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        padding: '3px 10px',
        borderRadius: '12px',
    },
    memberEmail: {
        fontSize: '13px',
        color: '#718096',
        fontStyle: 'italic',
    },
    codeActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    accessCode: {
        fontFamily: 'SF Mono, Monaco, monospace',
        fontSize: '13px',
        background: 'white',
        padding: '6px 12px',
        borderRadius: '6px',
        letterSpacing: '1px',
        color: '#4a5568',
        border: '1px solid #e2e8f0',
    },
    copyButton: {
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    projectDescription: {
        fontSize: '14px',
        color: '#4a5568',
        marginBottom: '14px',
        lineHeight: '1.5',
    },
    emptyState: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '60px 24px',
        backgroundColor: 'white',
        borderRadius: '20px',
        border: '2px dashed #e2e8f0',
    },
    emptyIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    emptyTitle: {
        fontSize: '22px',
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: '8px',
    },
    emptyText: {
        color: '#718096',
        fontSize: '16px',
        marginBottom: '24px',
    },
    emptyButton: {
        display: 'inline-block',
        padding: '14px 28px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '12px',
        fontWeight: '600',
        boxShadow: '0 6px 20px rgba(102, 126, 234, 0.35)',
    },
};

export default AdminDashboard;
