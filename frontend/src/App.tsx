import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import Onboarding from './components/Onboarding';
import Offboarding from './components/Offboarding';
import SLAMetrics from './components/SLAMetrics';
import AuditLogs from './components/AuditLogs';
import UserManagement from './components/UserManagement';
import Header from './components/Header';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
        <Header user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/board" element={<KanbanBoard user={user} />} />
          <Route path="/onboarding" element={<Onboarding user={user} />} />
          <Route path="/offboarding" element={<Offboarding user={user} />} />
          <Route path="/sla" element={<SLAMetrics user={user} />} />
          <Route path="/audit" element={<AuditLogs user={user} />} />
          <Route path="/users" element={<UserManagement user={user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
