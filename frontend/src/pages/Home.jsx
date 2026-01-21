import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
            <h1>Sprint Retrospective AI</h1>
            <p style={{ margin: '1rem 0' }}>Streamline your agile retrospectives with AI-powered insights.</p>
            <Link to="/admin/login" className="btn-primary" style={{ textDecoration: 'none' }}>
                Admin Login
            </Link>
        </div>
    );
};

export default Home;
