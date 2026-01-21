import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import '../styles/dashboard.css';

const AdminDashboard = () => {
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSprints();
    }, []);

    const fetchSprints = async () => {
        try {
            const response = await client.get('/admin/dashboard');
            setSprints(response.data.sprints || []);
        } catch (error) {
            console.error('Failed to fetch sprints', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await client.post('/admin/logout');
        window.location.href = '/admin/login';
    };

    // Helper for status badge
    const getStatusClass = (status) => {
        switch (status) {
            case 'collecting': return 'status-collecting';
            case 'analyzing': return 'status-analyzing';
            case 'analyzed': return 'status-analyzed';
            case 'closed': return 'status-closed';
            default: return '';
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Sprint Dashboard</h1>
                <div className="header-actions">
                    <button onClick={handleLogout} className="btn-secondary">Logout</button>
                    <Link to="/admin/sprint/create" className="btn-primary" style={{ textDecoration: 'none' }}>Create New Sprint</Link>
                </div>
            </header>

            {loading ? (
                <div className="text-center">Loading...</div>
            ) : (
                <div className="sprints-grid">
                    {sprints.length === 0 ? (
                        <div className="empty-state">
                            <h3>No sprints yet</h3>
                            <p>Create your first sprint to get started</p>
                        </div>
                    ) : (
                        sprints.map(sprint => (
                            <div key={sprint.id} className="sprint-card">
                                <div className="sprint-header">
                                    <h3>{sprint.name}</h3>
                                    <span className={`status-badge ${getStatusClass(sprint.status)}`}>
                                        {sprint.status}
                                    </span>
                                </div>
                                <div className="date-range">
                                    {sprint.start_date} - {sprint.end_date}
                                </div>

                                {sprint.share_token && (
                                    <div className="share-url-box">
                                        <input
                                            readOnly
                                            value={`${window.location.origin}/chat/${sprint.share_token}`}
                                            onClick={(e) => e.target.select()}
                                        />
                                        <button className="btn-copy">Copy</button>
                                    </div>
                                )}

                                <div className="actions">
                                    {/* Link to Report if analyzed */}
                                    {sprint.status === 'analyzed' && (
                                        <Link to={`/admin/sprint/${sprint.id}/report`} className="btn-primary">View Report</Link>
                                    )}
                                    <button className="btn-secondary">Details</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
