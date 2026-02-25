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
import TicketArchive from './components/TicketArchive';
import EmailSettings from './components/EmailSettings';
import KnowledgeBase from './components/KnowledgeBase';
import Header from './components/Header';
import UserProfile from './components/UserProfile';

// Protected route component
const ProtectedRoute: React.FC<{ user: any; allowedRoles?: string[]; allowedDepartments?: string[]; children: React.ReactElement }> = ({
  user,
  allowedRoles = [],
  allowedDepartments = [],
  children
}) => {
  // Check if user has required role
  const hasRole = allowedRoles.length === 0 || allowedRoles.includes(user.role);
  // Check if user has required department
  const hasDepartment = allowedDepartments.length === 0 || (user.department && allowedDepartments.includes(user.department));

  if (hasRole || hasDepartment) {
    return children;
  }

  // If not authorized, redirect to dashboard with error message
  return (
    <div className="page">
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>🚫 Accesso Negato</h2>
        <p style={{ marginBottom: '20px' }}>Non hai i permessi necessari per accedere a questa pagina.</p>
        <a href="/" className="btn btn-primary">Torna alla Dashboard</a>
      </div>
    </div>
  );
};

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

  const handleUserUpdate = (updatedUser: any) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
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
        <Header user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/board" element={<KanbanBoard user={user} />} />
          <Route path="/archivio" element={<TicketArchive user={user} />} />
          <Route path="/sla" element={<SLAMetrics user={user} />} />
          <Route path="/kb" element={<KnowledgeBase user={user} />} />

          {/* Onboarding - ADMIN, HR, IT, Amministrazione */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute
                user={user}
                allowedRoles={['ADMIN']}
                allowedDepartments={['HR', 'IT', 'Amministrazione']}
              >
                <Onboarding user={user} />
              </ProtectedRoute>
            }
          />

          {/* Offboarding - ADMIN, HR, IT, Amministrazione */}
          <Route
            path="/offboarding"
            element={
              <ProtectedRoute
                user={user}
                allowedRoles={['ADMIN']}
                allowedDepartments={['HR', 'IT', 'Amministrazione']}
              >
                <Offboarding user={user} />
              </ProtectedRoute>
            }
          />

          {/* Audit - only ADMIN */}
          <Route
            path="/audit"
            element={
              <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
                <AuditLogs user={user} />
              </ProtectedRoute>
            }
          />

          {/* User Management - only ADMIN */}
          <Route
            path="/users"
            element={
              <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
                <UserManagement user={user} />
              </ProtectedRoute>
            }
          />

          {/* Email Settings - only ADMIN */}
          <Route
            path="/settings/email"
            element={
              <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
                <EmailSettings user={user} />
              </ProtectedRoute>
            }
          />

          {/* User Profile */}
          <Route
            path="/profile"
            element={<UserProfile user={user} onUserUpdate={handleUserUpdate} />}
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
