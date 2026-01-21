import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';

const SprintReport = () => {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const [sprint, setSprint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReport();
    }, [id]);

    const fetchReport = async () => {
        try {
            // Fetch sprint details and report
            const [sprintRes, reportRes] = await Promise.all([
                client.get(`/api/sprint/${id}`),
                client.get(`/api/sprint/${id}/report`)
            ]);
            setSprint(sprintRes.data);
            setReport(reportRes.data);
        } catch (err) {
            console.error('Error fetching report', err);
            setError(err.response?.data?.error || 'Failed to load report. Maybe it is not generated yet?');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center mt-3">Loading report...</div>;
    // Error handling or empty state could be improved
    if (error) return (
        <div className="app-container text-center mt-3">
            <h3 style={{ color: 'var(--danger-color)' }}>{error}</h3>
            <Link to="/admin/dashboard" className="btn-secondary mt-2">Back to Dashboard</Link>
        </div>
    );

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <Link to="/admin/dashboard" style={{ textDecoration: 'none', color: 'var(--text-light)', fontSize: '0.9rem' }}>← Back to Dashboard</Link>
                    <h1>{sprint?.name} Retrospective Report</h1>
                </div>
                <button className="btn-secondary" onClick={() => window.print()}>Print Report</button>
            </header>

            {/* Themes Section */}
            <section className="mt-3">
                <h2 className="mb-2">Key Themes</h2>
                <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    {report?.themes?.map((theme, idx) => (
                        <div key={idx} className="sprint-card" style={{ borderLeft: `4px solid ${theme.category === 'Critical Issue' ? 'var(--danger-color)' : 'var(--success-color)'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <h3>{theme.name}</h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{theme.frequency}</span>
                            </div>
                            <p style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '0.9rem' }}>{theme.category}</p>
                            <p className="mt-1">{theme.impact}</p>
                            <div className="mt-2" style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '6px', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                "{theme.quotes?.[0]}"
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Recommendations Section */}
            <section className="mt-3" style={{ marginBottom: '4rem' }}>
                <h2 className="mb-2">Action Items & Recommendations</h2>
                <div className="modal-content" style={{ maxWidth: '100%', width: '100%' }}>
                    {report?.recommendations?.map((rec, idx) => (
                        <div key={idx} style={{ marginBottom: '2rem', borderBottom: idx < report.recommendations.length - 1 ? '1px solid var(--border-color)' : 'none', paddingBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem' }}>Theme: {rec.theme}</h3>
                                <span style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    background: rec.priority === 'High' ? '#fee2e2' : '#ecfdf5',
                                    color: rec.priority === 'High' ? '#b91c1c' : '#047857',
                                    fontWeight: 600,
                                    fontSize: '0.85rem'
                                }}>{rec.priority} Priority</span>
                            </div>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                {rec.action_items?.map((item, i) => (
                                    <li key={i} style={{ marginBottom: '0.5rem' }}>
                                        <strong>{item.action}</strong>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
                                            Effort: {item.effort} | Impact: {item.impact}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default SprintReport;
