import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ChatInterface from './pages/ChatInterface';
import Home from './pages/Home';
import CreateSprint from './pages/CreateSprint';
import SprintReport from './pages/SprintReport';
import './styles/main.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/sprint/create" element={<CreateSprint />} />
        <Route path="/admin/sprint/:id/report" element={<SprintReport />} />
        <Route path="/chat/:token" element={<ChatInterface />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
