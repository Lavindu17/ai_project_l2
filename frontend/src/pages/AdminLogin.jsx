import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const AdminLogin = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await client.post('/admin/login', { password });
            if (response.data.success) {
                navigate('/admin/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ marginTop: '0', maxWidth: '400px' }}>
                <h2 className="text-center">Admin Login</h2>
                {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
