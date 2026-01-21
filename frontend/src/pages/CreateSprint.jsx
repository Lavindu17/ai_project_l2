import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const CreateSprint = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        team_members: '' // comma separated for simplicity first
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Process team members
            const members = formData.team_members.split(',')
                .map(m => m.trim())
                .filter(m => m)
                .map(m => ({ name: m, role: 'Developer' })); // Default role

            const payload = {
                ...formData,
                team_members: members
            };

            const response = await client.post('/api/sprint/create', payload);
            if (response.data.success) {
                navigate('/admin/dashboard');
            }
        } catch (error) {
            console.error('Error creating sprint', error);
            alert('Failed to create sprint');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <h2 className="mb-3">Create New Sprint</h2>
            <form onSubmit={handleSubmit} className="modal-content" style={{ width: '100%', maxWidth: '100%' }}>
                <div className="form-group">
                    <label>Sprint Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Sprint 23"
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Start Date</label>
                        <input
                            type="date"
                            value={formData.start_date}
                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>End Date</label>
                        <input
                            type="date"
                            value={formData.end_date}
                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            required
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Team Members (comma separated names)</label>
                    <textarea
                        value={formData.team_members}
                        onChange={e => setFormData({ ...formData, team_members: e.target.value })}
                        placeholder="Alice, Bob, Charlie"
                        rows="3"
                    />
                </div>
                <div className="actions" style={{ gap: '1rem' }}>
                    <button type="button" onClick={() => navigate('/admin/dashboard')} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Sprint'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateSprint;
