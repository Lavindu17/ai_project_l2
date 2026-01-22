import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';
import ChatInterface from './pages/ChatInterface';
import Home from './pages/Home';
import CreateSprint from './pages/CreateSprint';
import SprintReport from './pages/SprintReport';
import CreateProject from './pages/CreateProject';
import SprintDetail from './pages/SprintDetail';

import './styles/main.css';

function App() {
  console.log("Frontend App Loaded");
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Authentication */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />

        {/* Dashboards */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/member/dashboard" element={<MemberDashboard />} />

        {/* Admin Routes */}
        <Route path="/admin/sprint/create" element={<CreateSprint />} />
        <Route path="/admin/sprint/:id" element={<SprintDetail />} />
        <Route path="/admin/sprint/:id/report" element={<SprintReport />} />
        <Route path="/admin/project/create" element={<CreateProject />} />

        {/* Chat Routes */}
        <Route path="/chat/session" element={<ChatInterface />} />
        <Route path="/chat/:token" element={<ChatInterface />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

