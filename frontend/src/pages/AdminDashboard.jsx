import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import client from '../api/client';
import '../styles/dashboard.css';

const AdminDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [unassignedSprints, setUnassignedSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedProjects, setExpandedProjects] = useState({});
    const [projectSprints, setProjectSprints] = useState({});
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

            const allSprints = sprintsRes.data.sprints || [];
            const allProjects = projectsRes.data.projects || [];

            // Separate sprints: those with projects vs unassigned
            const unassigned = allSprints.filter(s => !s.project_id);
            setUnassignedSprints(unassigned);
            setProjects(allProjects);

            // Pre-load sprints for each project
            const sprintsByProject = {};
            allSprints.forEach(sprint => {
                if (sprint.project_id) {
                    if (!sprintsByProject[sprint.project_id]) {
                        sprintsByProject[sprint.project_id] = [];
                    }
                    sprintsByProject[sprint.project_id].push(sprint);
                }
            });
            setProjectSprints(sprintsByProject);

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

    const toggleProject = (projectId) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectId]: !prev[projectId]
        }));
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



    const renderSprintCard = (sprint) => (
        <div key={sprint.id} style={styles.sprintCard}>
            <div style={styles.sprintCardHeader}>
                <h4 style={styles.sprintName}>{sprint.name}</h4>
                <span style={{ ...styles.statusBadge, ...getStatusStyle(sprint.status) }}>
                    {sprint.status}
                </span>
            </div>
            <div style={styles.sprintMeta}>
                <span>📅 {sprint.start_date} → {sprint.end_date}</span>
                <span>👥 {sprint.team_size || 0} members</span>
            </div>
            <div style={styles.sprintActions}>
                <button
                    onClick={() => navigate(`/admin/sprint/${sprint.id}`)}
                    style={styles.viewTeamButton}
                >
                    👥 View Team
                </button>
                {sprint.status === 'analyzed' && (
                    <Link to={`/admin/sprint/${sprint.id}/report`} style={styles.reportButton}>
                        📊 Report
                    </Link>
                )}
            </div>
        </div>
    );

    return (
        <div style={styles.pageContainer}>
            {notification && (
                <div style={styles.notification}>{notification}</div>
            )}

            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <h1 style={styles.headerTitle}>Sprint Dashboard</h1>
                    <p style={styles.headerSubtitle}>Manage your projects and retrospectives</p>
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

            {loading ? (
                <div style={styles.loadingContainer}>
                    <div className="loading-spinner"></div>
                    <p style={styles.loadingText}>Loading...</p>
                </div>
            ) : (
                <div style={styles.content}>
                    {/* Projects Section */}
                    {projects.length > 0 && (
                        <section style={styles.section}>
                            <h2 style={styles.sectionTitle}>📁 Projects</h2>
                            <div style={styles.projectList}>
                                {projects.map(project => (
                                    <div key={project.id} style={styles.projectCard}>
                                        <div
                                            style={styles.projectHeader}
                                            onClick={() => toggleProject(project.id)}
                                        >
                                            <div style={styles.projectInfo}>
                                                <span style={styles.expandIcon}>
                                                    {expandedProjects[project.id] ? '▼' : '▶'}
                                                </span>
                                                <div>
                                                    <h3 style={styles.projectName}>{project.name}</h3>
                                                    {project.description && (
                                                        <p style={styles.projectDescription}>{project.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <span style={styles.sprintCount}>
                                                {projectSprints[project.id]?.length || 0} sprints
                                            </span>
                                        </div>

                                        {expandedProjects[project.id] && (
                                            <div style={styles.projectSprints}>
                                                {projectSprints[project.id]?.length > 0 ? (
                                                    projectSprints[project.id].map(sprint => renderSprintCard(sprint))
                                                ) : (
                                                    <p style={styles.noSprintsText}>No sprints in this project yet.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Unassigned Sprints Section */}
                    {unassignedSprints.length > 0 && (
                        <section style={styles.section}>
                            <h2 style={styles.sectionTitle}>🏃 Unassigned Sprints</h2>
                            <div style={styles.sprintGrid}>
                                {unassignedSprints.map(sprint => renderSprintCard(sprint))}
                            </div>
                        </section>
                    )}

                    {/* Empty State */}
                    {projects.length === 0 && unassignedSprints.length === 0 && (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>🚀</div>
                            <h3 style={styles.emptyTitle}>Welcome to Sprint Retrospective</h3>
                            <p style={styles.emptyText}>Create a project or sprint to get started</p>
                            <div style={styles.emptyActions}>
                                <Link to="/admin/project/create" style={styles.secondaryButton}>
                                    Create Project
                                </Link>
                                <Link to="/admin/sprint/create" style={styles.primaryButton}>
                                    Create Sprint
                                </Link>
                            </div>
                        </div>
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
    loadingContainer: {
        textAlign: 'center',
        padding: '60px 20px',
    },
    loadingText: {
        color: '#718096',
        marginTop: '16px',
    },
    content: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    section: {
        marginBottom: '40px',
    },
    sectionTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '2px solid #e2e8f0',
    },
    projectList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    projectCard: {
        backgroundColor: 'white',
        borderRadius: '18px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        overflow: 'hidden',
    },
    projectHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
    projectInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
    },
    expandIcon: {
        fontSize: '12px',
        color: '#718096',
        width: '20px',
    },
    projectName: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1a202c',
        margin: 0,
    },
    projectDescription: {
        fontSize: '14px',
        color: '#718096',
        margin: '4px 0 0 0',
    },
    sprintCount: {
        fontSize: '13px',
        color: '#5a67d8',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
        padding: '6px 14px',
        borderRadius: '20px',
        fontWeight: '600',
    },
    projectSprints: {
        padding: '0 24px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
    },
    noSprintsText: {
        color: '#718096',
        fontStyle: 'italic',
        padding: '12px 0',
    },
    sprintGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
    },
    sprintCard: {
        backgroundColor: '#f7fafc',
        borderRadius: '14px',
        padding: '20px',
        border: '1px solid #e2e8f0',
    },
    sprintCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
    },
    sprintName: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#2d3748',
        margin: 0,
    },
    statusBadge: {
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '11px',
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
    sprintMeta: {
        display: 'flex',
        gap: '16px',
        fontSize: '13px',
        color: '#718096',
        marginBottom: '16px',
    },
    sprintActions: {
        display: 'flex',
        gap: '10px',
    },
    viewTeamButton: {
        padding: '10px 18px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
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
    emptyState: {
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
    emptyActions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
    },
};

export default AdminDashboard;
