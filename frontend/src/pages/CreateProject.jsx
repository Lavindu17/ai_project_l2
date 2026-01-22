import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Lightbulb, ArrowLeft } from 'lucide-react';
import client from '../api/client';

const CreateProject = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Project name is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await client.post('/api/project/create', formData);
            if (response.data.success) {
                navigate('/admin/dashboard', {
                    state: { message: 'Project created successfully!' }
                });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={styles.container}>
            <div style={styles.header}>
                <button
                    onClick={() => navigate('/admin/dashboard')}
                    style={styles.backButton}
                >
                    <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back to Dashboard
                </button>
            </div>

            <div style={styles.formWrapper}>
                <div style={styles.formHeader}>
                    <div style={styles.iconWrapper}>
                        <Folder size={32} color="#4299e1" />
                    </div>
                    <h2 style={styles.title}>Create New Project</h2>
                    <p style={styles.subtitle}>Organize your sprints under a project</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Project Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Mobile App Redesign"
                            style={styles.input}
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Description <span style={styles.optional}>(Optional)</span></label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of what this project is about..."
                            style={styles.textarea}
                            rows={4}
                        />
                    </div>

                    {error && <div style={styles.error}>{error}</div>}

                    <div style={styles.actions}>
                        <button
                            type="button"
                            onClick={() => navigate('/admin/dashboard')}
                            style={styles.cancelButton}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={styles.submitButton}
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>

            <div style={styles.infoBox}>
                <div style={styles.infoIcon}>
                    <Lightbulb size={24} color="#4299e1" />
                </div>
                <div>
                    <h4 style={styles.infoTitle}>Why create projects?</h4>
                    <p style={styles.infoText}>
                        Projects help you organize multiple sprints together. Team members added
                        to sprints will receive unique access codes for retrospective feedback.
                    </p>
                </div>
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
    header: {
        maxWidth: '640px',
        margin: '0 auto 24px',
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        color: '#4a5568',
        transition: 'all 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
    },
    formWrapper: {
        maxWidth: '640px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    },
    formHeader: {
        textAlign: 'center',
        marginBottom: '32px',
    },
    iconWrapper: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: '8px',
        letterSpacing: '-0.5px',
    },
    subtitle: {
        fontSize: '16px',
        color: '#718096',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#4a5568',
    },
    optional: {
        fontWeight: '400',
        color: '#a0aec0',
    },
    input: {
        width: '100%',
        padding: '14px 18px',
        fontSize: '16px',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        outline: 'none',
        transition: 'all 0.2s',
        boxSizing: 'border-box',
        color: '#2d3748',
        background: 'white',
    },
    textarea: {
        width: '100%',
        padding: '14px 18px',
        fontSize: '16px',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        color: '#2d3748',
        background: 'white',
    },
    actions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        marginTop: '16px',
    },
    cancelButton: {
        padding: '14px 28px',
        fontSize: '15px',
        fontWeight: '600',
        backgroundColor: 'white',
        color: '#4a5568',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    submitButton: {
        padding: '14px 28px',
        fontSize: '15px',
        fontWeight: '600',
        background: '#4299e1', // Flat Blue
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(66, 153, 225, 0.3)',
        transition: 'transform 0.2s',
    },
    error: {
        padding: '14px 18px',
        background: '#fff5f5',
        color: '#c53030',
        borderRadius: '12px',
        fontSize: '14px',
        border: '1px solid #feb2b2',
    },
    infoBox: {
        maxWidth: '640px',
        margin: '24px auto 0',
        padding: '20px 24px',
        background: '#ebf8ff', // Flat Light Blue
        borderRadius: '16px',
        border: '1px solid #bee3f8',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
    },
    infoIcon: {
        fontSize: '24px',
        flexShrink: 0,
    },
    infoTitle: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#2c5282',
        marginBottom: '4px',
    },
    infoText: {
        fontSize: '14px',
        color: '#2a4365',
        margin: 0,
        lineHeight: '1.5',
    },
};

export default CreateProject;
