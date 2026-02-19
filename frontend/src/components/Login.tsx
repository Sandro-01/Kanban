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
        // Server ha risposto con un errore
        setError(err.response.data?.error || 'Errore durante il login');
      } else if (err.request) {
        // Nessuna risposta dal server
        setError('Impossibile contattare il server. Verifica che il backend sia in esecuzione.');
      } else {
        setError('Errore durante il login');
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
          <p>Sistema di gestione conforme ISO 9001/27001</p>
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
              placeholder="utente@azienda.it"
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
            {loading ? 'Login in corso...' : 'Accedi'}
          </button>
        </form>

        <div className="login-footer">
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
            Contattare l'amministratore per le credenziali di accesso.
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
