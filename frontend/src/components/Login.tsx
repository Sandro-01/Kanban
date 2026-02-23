import React, { useState } from 'react';
import { auth } from '../services/api';
import './Login.css';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await auth.login(email, password);
      onLogin(response.data.token, response.data.user);
    } catch (err: any) {
      if (err.response) {
        // Server responded with an error
        setError(err.response.data?.error || 'Login error');
      } else if (err.request) {
        // No response from server
        setError('Unable to contact the server. Please ensure the backend is running.');
      } else {
        setError('Login error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Kanban ISO</h1>
          <p>Management system compliant with ISO 9001/27001</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@company.com"
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
            Contact the administrator for login credentials.
          </p>
        </div>

        <div className="iso-badges">
          <span className="iso-badge">ISO 9001</span>
          <span className="iso-badge">ISO 27001</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
