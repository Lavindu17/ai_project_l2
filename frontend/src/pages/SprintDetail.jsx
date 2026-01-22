import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Folder,
    CalendarRange,
    CheckCircle,
    Clock,
    Users,
    BarChart2,
    Target,
    Sparkles
} from 'lucide-react';
import client from '../api/client';

const SprintDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState('');

    useEffect(() => {
        fetchSprintDetails();
    }, [id]);

    const fetchSprintDetails = async () => {
        try {
            const response = await client.get(`/api/sprint/${id}/details`);
            setData(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load sprint details');
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        setAnalyzeError('');
        try {
            await client.post(`/api/sprint/${id}/analyze`);
            // Refresh data to get updated status
            await fetchSprintDetails();
        } catch (err) {
            setAnalyzeError(err.response?.data?.error || 'Failed to generate report');
        } finally {
            setAnalyzing(false);
        }
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

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div className="loading-spinner"></div>
                <p style={styles.loadingText}>Loading sprint details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.errorContainer}>
                <div style={styles.errorIcon}>⚠️</div>
                <h2 style={styles.errorTitle}>Error</h2>
                <p style={styles.errorText}>{error}</p>
                <button onClick={() => navigate('/admin/dashboard')} style={styles.backButton}>
                    ← Back to Dashboard
                </button>
            </div>
        );
    }

    const { sprint, project, team_members, stats } = data;

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button onClick={() => navigate('/admin/dashboard')} style={styles.backButton}>
                    <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back to Dashboard
                </button>
            </div>

            {/* Sprint Header Card */}
            <div style={styles.mainCard}>
                <div style={styles.sprintHeader}>
                    <div>
                        <h1 style={styles.sprintName}>{sprint.name}</h1>
                        {project && (
                            <p style={styles.projectName}><Folder size={14} style={{ display: 'inline', marginRight: '4px' }} /> {project.name}</p>
                        )}
                    </div>
                    <span style={{ ...styles.statusBadge, ...getStatusStyle(sprint.status) }}>
                        {sprint.status}
                    </span>
                </div>

                <div style={styles.metaRow}>
                    <div style={styles.metaItem}>
                        <span style={styles.metaLabel}><CalendarRange size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Duration</span>
                        <span style={styles.metaValue}>{sprint.start_date} → {sprint.end_date}</span>
                    </div>
                </div>

                {/* Progress Stats */}
                <div style={styles.progressSection}>
                    <div style={styles.progressHeader}>
                        <span style={styles.progressTitle}>Submission Progress</span>
                        <span style={styles.progressPercent}>{stats.percentage}%</span>
                    </div>
                    <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${stats.percentage}%` }}></div>
                    </div>
                    <div style={styles.progressStats}>
                        <span style={styles.statItem}><CheckCircle size={14} style={{ verticalAlign: 'text-bottom' }} /> {stats.submitted} submitted</span>
                        <span style={styles.statItem}><Clock size={14} style={{ verticalAlign: 'text-bottom' }} /> {stats.pending} pending</span>
                        <span style={styles.statItem}><Users size={14} style={{ verticalAlign: 'text-bottom' }} /> {stats.total} total</span>
                    </div>
                </div>

                {/* Actions */}
                <div style={styles.actionRow}>
                    {/* Show Generate Report button when collecting and has submissions */}
                    {(sprint.status === 'collecting' || sprint.status === 'active') && stats.submitted > 0 && (
                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing}
                            style={{
                                ...styles.analyzeButton,
                                opacity: analyzing ? 0.7 : 1,
                                cursor: analyzing ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Sparkles size={16} style={{ marginRight: '6px' }} />
                            {analyzing ? 'Generating Report...' : 'Generate AI Report'}
                        </button>
                    )}

                    {/* Show analyzing status */}
                    {sprint.status === 'analyzing' && (
                        <div style={styles.analyzingStatus}>
                            <div className="loading-spinner" style={{ width: '20px', height: '20px', marginRight: '8px' }}></div>
                            Analysis in progress...
                        </div>
                    )}

                    {/* Show View Report button when analyzed */}
                    {sprint.status === 'analyzed' && (
                        <Link to={`/admin/sprint/${sprint.id}/report`} style={styles.reportButton}>
                            <BarChart2 size={16} style={{ marginRight: '6px' }} /> View Report
                        </Link>
                    )}
                </div>

                {/* Error message */}
                {analyzeError && (
                    <div style={styles.errorMessage}>
                        ⚠️ {analyzeError}
                    </div>
                )}
            </div>

            {/* Sprint Goals */}
            {sprint.goals && sprint.goals.length > 0 && (
                <div style={styles.sectionCard}>
                    <h2 style={styles.sectionTitle}><Target size={20} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} /> Sprint Goals</h2>
                    <ul style={styles.goalsList}>
                        {sprint.goals.map((goal, idx) => (
                            <li key={idx} style={styles.goalItem}>
                                <span style={styles.goalNumber}>{idx + 1}</span>
                                {goal.goal_text || goal}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Team Members */}
            <div style={styles.sectionCard}>
                <h2 style={styles.sectionTitle}><Users size={20} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} /> Team Members</h2>

                {team_members.length === 0 ? (
                    <p style={styles.emptyText}>No team members added to this sprint.</p>
                ) : (
                    <div style={styles.memberGrid}>
                        {team_members.map((member, idx) => (
                            <div key={idx} style={styles.memberCard}>
                                <div style={styles.memberTop}>
                                    <div style={styles.avatar}>
                                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div style={styles.memberInfo}>
                                        <span style={styles.memberName}>{member.name}</span>
                                        <span style={styles.memberRole}>{member.role}</span>
                                    </div>
                                </div>
                                {member.email && (
                                    <p style={styles.memberEmail}>{member.email}</p>
                                )}
                                <div style={styles.memberStatus}>
                                    {member.has_submitted ? (
                                        <span style={styles.submittedBadge}><CheckCircle size={12} style={{ marginRight: '4px' }} /> Submitted</span>
                                    ) : (
                                        <span style={styles.pendingBadge}><Clock size={12} style={{ marginRight: '4px' }} /> Pending</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', // Match AuthPage
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    },
    loadingText: {
        marginTop: '16px',
        color: '#718096',
        fontSize: '16px',
    },
    errorContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    },
    errorIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    errorTitle: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: '8px',
    },
    errorText: {
        color: '#718096',
        marginBottom: '24px',
    },
    header: {
        maxWidth: '900px',
        margin: '0 auto 24px',
    },
    backButton: {
        padding: '12px 20px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        color: '#4a5568',
        textDecoration: 'none',
        display: 'inline-block',
        transition: 'all 0.2s',
    },
    mainCard: {
        maxWidth: '900px',
        margin: '0 auto 24px',
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    },
    sprintHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
    },
    sprintName: {
        fontSize: '32px',
        fontWeight: '800',
        color: '#1a202c',
        marginBottom: '8px',
        letterSpacing: '-0.5px',
    },
    projectName: {
        fontSize: '16px',
        color: '#4299e1',
        margin: 0,
    },
    statusBadge: {
        padding: '8px 18px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    statusCollecting: {
        background: '#ebf8ff',
        color: '#4299e1',
    },
    statusAnalyzing: {
        background: '#fffff0',
        color: '#d69e2e',
    },
    statusAnalyzed: {
        background: '#f0fff4',
        color: '#38a169',
    },
    statusClosed: {
        background: '#edf2f7',
        color: '#718096',
    },
    metaRow: {
        display: 'flex',
        gap: '32px',
        marginBottom: '28px',
        paddingBottom: '24px',
        borderBottom: '2px solid #f0f4ff',
    },
    metaItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    metaLabel: {
        fontSize: '13px',
        color: '#718096',
        fontWeight: '600',
    },
    metaValue: {
        fontSize: '15px',
        color: '#2d3748',
        fontWeight: '600',
    },
    progressSection: {
        marginBottom: '24px',
    },
    progressHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
    },
    progressTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#4a5568',
    },
    progressPercent: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#4299e1',
    },
    progressBar: {
        height: '10px',
        backgroundColor: '#e2e8f0',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '12px',
    },
    progressFill: {
        height: '100%',
        background: '#4299e1', // Flat Blue
        borderRadius: '10px',
        transition: 'width 0.5s ease',
    },
    progressStats: {
        display: 'flex',
        gap: '24px',
    },
    statItem: {
        fontSize: '13px',
        color: '#718096',
    },
    actionRow: {
        display: 'flex',
        gap: '12px',
    },
    reportButton: {
        padding: '14px 28px',
        background: '#48bb78', // Flat Green
        color: 'white',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        textDecoration: 'none',
        boxShadow: '0 4px 6px rgba(72, 187, 120, 0.3)',
        display: 'flex',
        alignItems: 'center',
    },
    analyzeButton: {
        padding: '14px 28px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        border: 'none',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.3s ease',
    },
    analyzingStatus: {
        display: 'flex',
        alignItems: 'center',
        padding: '14px 28px',
        background: '#fffff0',
        color: '#d69e2e',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
    },
    errorMessage: {
        marginTop: '16px',
        padding: '12px 20px',
        background: '#fed7d7',
        color: '#c53030',
        borderRadius: '10px',
        fontSize: '14px',
    },
    sectionCard: {
        maxWidth: '900px',
        margin: '0 auto 24px',
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: '20px',
    },
    goalsList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
    },
    goalItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px',
        background: '#f8fafc',
        borderRadius: '12px',
        marginBottom: '10px',
        fontSize: '15px',
        color: '#2d3748',
        border: '1px solid #e2e8f0',
    },
    goalNumber: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: '#4299e1', // Flat Blue
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '700',
        flexShrink: 0,
    },
    emptyText: {
        color: '#718096',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: '20px',
    },
    memberGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
    },
    memberCard: {
        background: '#f8fafc',
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
    },
    memberTop: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '10px',
    },
    avatar: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: '#4299e1', // Flat Blue
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: '700',
    },
    memberInfo: {
        display: 'flex',
        flexDirection: 'column',
    },
    memberName: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#1a202c',
    },
    memberRole: {
        fontSize: '13px',
        color: '#5a67d8',
        fontWeight: '600',
    },
    memberEmail: {
        fontSize: '13px',
        color: '#718096',
        margin: '0 0 12px 0',
    },
    memberStatus: {},
    submittedBadge: {
        display: 'inline-block',
        fontSize: '12px',
        color: '#047857',
        fontWeight: '600',
        background: '#f0fff4',
        padding: '6px 14px',
        borderRadius: '20px',
    },
    pendingBadge: {
        display: 'inline-block',
        fontSize: '12px',
        color: '#b45309',
        fontWeight: '600',
        background: '#fffff0',
        padding: '6px 14px',
        borderRadius: '20px',
    },
};

export default SprintDetail;
