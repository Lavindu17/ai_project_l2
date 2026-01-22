import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const TEAM_ROLES = [
    'Developer',
    'Senior Developer',
    'Tech Lead',
    'Designer',
    'UI/UX Designer',
    'QA Engineer',
    'QA Lead',
    'Product Manager',
    'Product Owner',
    'Scrum Master',
    'DevOps Engineer',
    'Data Analyst',
    'Business Analyst'
];

const CreateSprint = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        project_id: '',
        start_date: '',
        end_date: '',
        goals: [''],
        team_members: [{ name: '', role: 'Developer', email: '' }]
    });
    const [loading, setLoading] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await client.get('/api/project/list');
            setProjects(response.data.projects || []);
        } catch (err) {
            console.error('Failed to fetch projects', err);
        } finally {
            setLoadingProjects(false);
        }
    };

    const addGoal = () => {
        setFormData({ ...formData, goals: [...formData.goals, ''] });
    };

    const updateGoal = (index, value) => {
        const newGoals = [...formData.goals];
        newGoals[index] = value;
        setFormData({ ...formData, goals: newGoals });
    };

    const removeGoal = (index) => {
        if (formData.goals.length > 1) {
            const newGoals = formData.goals.filter((_, i) => i !== index);
            setFormData({ ...formData, goals: newGoals });
        }
    };

    const addTeamMember = () => {
        setFormData({
            ...formData,
            team_members: [...formData.team_members, { name: '', role: 'Developer', email: '' }]
        });
    };

    const updateTeamMember = (index, field, value) => {
        const newMembers = [...formData.team_members];
        newMembers[index][field] = value;
        setFormData({ ...formData, team_members: newMembers });
    };

    const removeTeamMember = (index) => {
        if (formData.team_members.length > 1) {
            const newMembers = formData.team_members.filter((_, i) => i !== index);
            setFormData({ ...formData, team_members: newMembers });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                ...formData,
                goals: formData.goals.filter(g => g.trim()),
                team_members: formData.team_members.filter(m => m.name.trim())
            };

            const response = await client.post('/api/sprint/create', payload);
            if (response.data.success) {
                navigate('/admin/dashboard', {
                    state: {
                        message: 'Sprint created successfully!',
                        sprintId: response.data.sprint_id
                    }
                });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create sprint');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate('/admin/dashboard')} style={styles.backButton}>
                    ← Back to Dashboard
                </button>
                <h2 style={styles.pageTitle}>Create New Sprint</h2>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
                {/* Basic Info Section */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionIcon}>📋</span>
                        <h3 style={styles.sectionTitle}>Basic Information</h3>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Sprint Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Sprint 23"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Project <span style={styles.optional}>(Optional)</span></label>
                        <select
                            value={formData.project_id}
                            onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                            style={styles.select}
                            disabled={loadingProjects}
                        >
                            <option value="">-- Select Project --</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Start Date</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>End Date</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                required
                                style={styles.input}
                            />
                        </div>
                    </div>
                </div>

                {/* Sprint Goals Section */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionIcon}>🎯</span>
                        <div>
                            <h3 style={styles.sectionTitle}>Sprint Goals</h3>
                            <p style={styles.sectionHint}>Define what the team aims to achieve</p>
                        </div>
                    </div>

                    {formData.goals.map((goal, idx) => (
                        <div key={idx} style={styles.goalRow}>
                            <span style={styles.goalNumber}>{idx + 1}</span>
                            <input
                                type="text"
                                value={goal}
                                onChange={e => updateGoal(idx, e.target.value)}
                                placeholder="Complete user authentication feature..."
                                style={styles.goalInput}
                            />
                            {formData.goals.length > 1 && (
                                <button type="button" onClick={() => removeGoal(idx)} style={styles.removeBtn}>
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addGoal} style={styles.addButton}>
                        + Add Another Goal
                    </button>
                </div>

                {/* Team Members Section */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionIcon}>👥</span>
                        <div>
                            <h3 style={styles.sectionTitle}>Team Members</h3>
                            <p style={styles.sectionHint}>Add members by email to give them access</p>
                        </div>
                    </div>

                    {formData.team_members.map((member, idx) => (
                        <div key={idx} style={styles.memberCard}>
                            <div style={styles.memberHeader}>
                                <span style={styles.memberBadge}>Member {idx + 1}</span>
                                {formData.team_members.length > 1 && (
                                    <button type="button" onClick={() => removeTeamMember(idx)} style={styles.removeMemberBtn}>
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div style={styles.memberFields}>
                                <div style={styles.memberField}>
                                    <label style={styles.smallLabel}>Name</label>
                                    <input
                                        type="text"
                                        value={member.name}
                                        onChange={e => updateTeamMember(idx, 'name', e.target.value)}
                                        placeholder="John Doe"
                                        style={styles.memberInput}
                                        required
                                    />
                                </div>

                                <div style={styles.memberField}>
                                    <label style={styles.smallLabel}>Role</label>
                                    <select
                                        value={member.role}
                                        onChange={e => updateTeamMember(idx, 'role', e.target.value)}
                                        style={styles.memberSelect}
                                    >
                                        {TEAM_ROLES.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={styles.memberField}>
                                    <label style={styles.smallLabel}>Email</label>
                                    <input
                                        type="email"
                                        value={member.email}
                                        onChange={e => updateTeamMember(idx, 'email', e.target.value)}
                                        placeholder="john@company.com"
                                        style={styles.memberInput}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button type="button" onClick={addTeamMember} style={styles.addButton}>
                        + Add Team Member
                    </button>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.actions}>
                    <button type="button" onClick={() => navigate('/admin/dashboard')} style={styles.cancelButton}>
                        Cancel
                    </button>
                    <button type="submit" style={styles.submitButton} disabled={loading}>
                        {loading ? 'Creating Sprint...' : 'Create Sprint'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(180deg, #f0f4ff 0%, #fafbff 100%)',
    },
    header: {
        maxWidth: '800px',
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        color: '#4a5568',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
    },
    pageTitle: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1a202c',
        letterSpacing: '-0.5px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '800px',
        margin: '0 auto',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        marginBottom: '24px',
    },
    sectionIcon: {
        fontSize: '28px',
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: '2px',
    },
    sectionHint: {
        fontSize: '14px',
        color: '#718096',
        margin: 0,
    },
    formGroup: {
        marginBottom: '20px',
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#4a5568',
        marginBottom: '8px',
    },
    smallLabel: {
        display: 'block',
        fontSize: '12px',
        fontWeight: '600',
        color: '#718096',
        marginBottom: '6px',
    },
    optional: {
        fontWeight: '400',
        color: '#a0aec0',
    },
    input: {
        width: '100%',
        padding: '14px 16px',
        fontSize: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        outline: 'none',
        boxSizing: 'border-box',
        color: '#2d3748',
        background: '#fafbff',
        transition: 'border-color 0.2s',
    },
    select: {
        width: '100%',
        padding: '14px 16px',
        fontSize: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        outline: 'none',
        backgroundColor: '#fafbff',
        boxSizing: 'border-box',
        color: '#2d3748',
    },
    goalRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
    },
    goalNumber: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '700',
        flexShrink: 0,
    },
    goalInput: {
        flex: 1,
        padding: '12px 16px',
        fontSize: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        outline: 'none',
        color: '#2d3748',
        background: '#fafbff',
    },
    memberCard: {
        background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
        borderRadius: '14px',
        padding: '18px',
        marginBottom: '14px',
        border: '1px solid #e2e8f0',
    },
    memberHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
    },
    memberBadge: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#5a67d8',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
        padding: '6px 14px',
        borderRadius: '20px',
    },
    memberFields: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1.2fr',
        gap: '14px',
    },
    memberField: {
        display: 'flex',
        flexDirection: 'column',
    },
    memberInput: {
        padding: '10px 12px',
        fontSize: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        outline: 'none',
        color: '#2d3748',
        background: 'white',
    },
    memberSelect: {
        padding: '10px 12px',
        fontSize: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        outline: 'none',
        backgroundColor: 'white',
        color: '#2d3748',
    },
    addButton: {
        padding: '14px 20px',
        fontSize: '14px',
        fontWeight: '600',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%)',
        color: '#5a67d8',
        border: '2px dashed #c3dafe',
        borderRadius: '12px',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.2s',
    },
    removeBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: '#fed7d7',
        color: '#c53030',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
    },
    removeMemberBtn: {
        padding: '6px 14px',
        fontSize: '12px',
        backgroundColor: 'transparent',
        color: '#e53e3e',
        border: '1px solid #feb2b2',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '500',
    },
    actions: {
        display: 'flex',
        gap: '14px',
        justifyContent: 'flex-end',
    },
    cancelButton: {
        padding: '16px 32px',
        fontSize: '15px',
        fontWeight: '500',
        backgroundColor: 'white',
        color: '#4a5568',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        cursor: 'pointer',
    },
    submitButton: {
        padding: '16px 32px',
        fontSize: '15px',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(102, 126, 234, 0.35)',
    },
    error: {
        padding: '16px',
        background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
        color: '#c53030',
        borderRadius: '12px',
        fontSize: '14px',
        border: '1px solid #feb2b2',
    },
};

export default CreateSprint;
