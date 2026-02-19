import React, { useEffect, useState } from 'react';
import { emailConfig } from '../services/api';
import './EmailSettings.css';

interface EmailSettingsProps {
  user: any;
}

interface EmailStatus {
  method: 'graph' | 'smtp';
  configured: boolean;
  mailbox?: string;
  host?: string;
  user?: string;
}

const EmailSettings: React.FC<EmailSettingsProps> = ({ user }) => {
  const [config, setConfig] = useState<Record<string, string>>({
    company_name: '',
    company_logo_url: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_password: '',
    smtp_from: '',
    imap_host: '',
    imap_port: '993',
    imap_user: '',
    imap_password: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);

  useEffect(() => {
    loadConfig();
    loadStatus();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await emailConfig.get();
      setConfig(prev => ({ ...prev, ...res.data }));
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Errore caricamento configurazione: ' + (err.response?.data?.error || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const res = await emailConfig.status();
      setEmailStatus(res.data);
    } catch {
      // Non bloccante
    }
  };

  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await emailConfig.save(config);
      setMessage({ type: 'success', text: 'Configurazione salvata con successo!' });
      // Reload to get masked passwords back
      await loadConfig();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Errore salvataggio: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await emailConfig.test();
      setTestResult({ type: 'success', text: res.data.message || 'Connessione riuscita!' });
    } catch (err: any) {
      setTestResult({ type: 'error', text: 'Test fallito: ' + (err.response?.data?.error || err.message) });
    } finally {
      setTesting(false);
    }
  };

  if (user.role !== 'ADMIN') {
    return (
      <div className="email-settings-page">
        <div className="alert alert-danger">
          Accesso negato: Solo gli amministratori possono configurare le impostazioni email.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="email-settings-page">
        <p>Caricamento configurazione...</p>
      </div>
    );
  }

  const isGraph = emailStatus?.method === 'graph';

  return (
    <div className="email-settings-page">
      <h2>Configurazione Email</h2>
      <p className="page-subtitle">Configura l'invio e la ricezione delle email.</p>

      {/* Status Banner */}
      {emailStatus && (
        <div className={`email-status-banner ${emailStatus.configured ? 'status-active' : 'status-inactive'}`}>
          <div className="status-indicator">
            <span className={`status-dot ${emailStatus.configured ? 'dot-active' : 'dot-inactive'}`}></span>
            <strong>
              {isGraph ? 'Microsoft Graph API' : 'SMTP'}
            </strong>
          </div>
          <span className="status-detail">
            {isGraph
              ? `Casella: ${emailStatus.mailbox || 'non configurata'}`
              : emailStatus.configured
                ? `Host: ${emailStatus.host} | Utente: ${emailStatus.user}`
                : 'Non configurato — compilare i campi sottostanti'
            }
          </span>
        </div>
      )}

      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}>
          {message.text}
        </div>
      )}

      {/* Company Name + Logo */}
      <div className="config-section">
        <h3>Generale</h3>
        <p className="section-desc">Nome azienda e logo visualizzati nelle email e nelle notifiche.</p>
        <div className="config-grid">
          <div className="config-field">
            <label>Nome Azienda</label>
            <input
              type="text"
              value={config.company_name}
              onChange={e => handleChange('company_name', e.target.value)}
              placeholder="es. Nome Azienda S.r.l."
            />
          </div>
          <div className="config-field">
            <label>Logo URL <span style={{ fontWeight: 'normal', color: '#64748b' }}>(opzionale — sostituisce il nome nell'header email)</span></label>
            <input
              type="url"
              value={config.company_logo_url}
              onChange={e => handleChange('company_logo_url', e.target.value)}
              placeholder="https://esempio.com/logo.png"
            />
            {config.company_logo_url && (
              <div style={{ marginTop: '10px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                <img
                  src={config.company_logo_url}
                  alt="Anteprima logo"
                  style={{ maxWidth: '180px', maxHeight: '60px', objectFit: 'contain', display: 'block' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Graph API Info */}
      {isGraph && (
        <div className="config-section">
          <h3>Microsoft Graph API</h3>
          <p className="section-desc">
            L'invio e la ricezione delle email avviene tramite Microsoft Graph API (Azure AD).
            La configurazione delle credenziali Azure (Tenant ID, Client ID, Client Secret) viene gestita
            tramite variabili d'ambiente sul server.
          </p>
          <div className="config-grid">
            <div className="config-field">
              <label>Casella condivisa</label>
              <input type="text" value={emailStatus?.mailbox || ''} disabled />
            </div>
          </div>

          <div className="config-actions">
            <button className="btn-test" onClick={handleTest} disabled={testing}>
              {testing ? 'Test in corso...' : 'Test Connessione Graph'}
            </button>
          </div>

          {testResult && (
            <div className={`test-result ${testResult.type === 'success' ? 'test-success' : 'test-error'}`}>
              {testResult.text}
            </div>
          )}
        </div>
      )}

      {/* SMTP Section - only show if not using Graph */}
      {!isGraph && (
        <div className="config-section">
          <h3>SMTP - Invio Email</h3>
          <p className="section-desc">Server per l'invio di email in uscita (notifiche, risposte ai ticket).</p>

          <div className="config-grid">
            <div className="config-field">
              <label>Host SMTP</label>
              <input
                type="text"
                value={config.smtp_host}
                onChange={e => handleChange('smtp_host', e.target.value)}
                placeholder="es. smtp.gmail.com"
              />
            </div>
            <div className="config-field">
              <label>Porta</label>
              <input
                type="number"
                value={config.smtp_port}
                onChange={e => handleChange('smtp_port', e.target.value)}
                placeholder="587"
              />
            </div>
            <div className="config-field">
              <label>Connessione sicura (SSL/TLS)</label>
              <select
                value={config.smtp_secure}
                onChange={e => handleChange('smtp_secure', e.target.value)}
              >
                <option value="false">No (STARTTLS - porta 587)</option>
                <option value="true">Si (SSL/TLS - porta 465)</option>
              </select>
            </div>
            <div className="config-field">
              <label>Indirizzo mittente (From)</label>
              <input
                type="email"
                value={config.smtp_from}
                onChange={e => handleChange('smtp_from', e.target.value)}
                placeholder="es. noreply@azienda.com"
              />
            </div>
            <div className="config-field">
              <label>Utente SMTP</label>
              <input
                type="text"
                value={config.smtp_user}
                onChange={e => handleChange('smtp_user', e.target.value)}
                placeholder="es. user@azienda.com"
              />
            </div>
            <div className="config-field">
              <label>Password SMTP</label>
              <input
                type="password"
                value={config.smtp_password}
                onChange={e => handleChange('smtp_password', e.target.value)}
                placeholder="Password"
              />
            </div>
          </div>

          <div className="config-actions">
            <button className="btn-test" onClick={handleTest} disabled={testing}>
              {testing ? 'Test in corso...' : 'Test Connessione SMTP'}
            </button>
          </div>

          {testResult && (
            <div className={`test-result ${testResult.type === 'success' ? 'test-success' : 'test-error'}`}>
              {testResult.text}
            </div>
          )}
        </div>
      )}

      {/* IMAP Section - only show if not using Graph */}
      {!isGraph && (
        <div className="config-section">
          <h3>IMAP - Ricezione Email</h3>
          <p className="section-desc">Server per la ricezione delle risposte email e creazione automatica dei ticket.</p>

          <div className="config-grid">
            <div className="config-field">
              <label>Host IMAP</label>
              <input
                type="text"
                value={config.imap_host}
                onChange={e => handleChange('imap_host', e.target.value)}
                placeholder="es. imap.gmail.com"
              />
            </div>
            <div className="config-field">
              <label>Porta</label>
              <input
                type="number"
                value={config.imap_port}
                onChange={e => handleChange('imap_port', e.target.value)}
                placeholder="993"
              />
            </div>
            <div className="config-field">
              <label>Utente IMAP</label>
              <input
                type="text"
                value={config.imap_user}
                onChange={e => handleChange('imap_user', e.target.value)}
                placeholder="es. user@azienda.com"
              />
            </div>
            <div className="config-field">
              <label>Password IMAP</label>
              <input
                type="password"
                value={config.imap_password}
                onChange={e => handleChange('imap_password', e.target.value)}
                placeholder="Password"
              />
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvataggio...' : 'Salva Configurazione'}
        </button>
      </div>
    </div>
  );
};

export default EmailSettings;
