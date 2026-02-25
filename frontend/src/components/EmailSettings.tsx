import React, { useEffect, useState } from 'react';
import { emailConfig } from '../services/api';
import './EmailSettings.css';

interface EmailSettingsProps {
  user: any;
}

const EmailSettings: React.FC<EmailSettingsProps> = ({ user }) => {
  const [config, setConfig] = useState({
    companyName:  '',
    logoUrl:      '',
    smtpHost:     '',
    smtpPort:     '587',
    smtpSecure:   'false',
    smtpFrom:     '',
    smtpUser:     '',
    smtpPassword: '',
    imapHost:     '',
    imapPort:     '993',
    imapUser:     '',
    imapPassword: '',
  });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    emailConfig.get()
      .then(res => setConfig(res.data))
      .catch(err => setError('Error loading configuration: ' + (err.response?.data?.error || err.message)))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSuccess('');
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await emailConfig.save(config);
      setSuccess('Configuration saved successfully.');
    } catch (err: any) {
      setError('Error saving configuration: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await emailConfig.test();
      setTestResult({ ok: true, msg: 'SMTP connection successful.' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.response?.data?.error || err.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading email configuration...</div>;
  }

  return (
    <div className="page email-settings-page">
      <div className="page-header">
        <h1>Email Configuration</h1>
        <p>Configure sending and receiving of emails.</p>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* GENERAL */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h2>General</h2>
          <p>Company name and logo displayed in emails and notifications.</p>
        </div>
        <div className="settings-grid-2">
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Company Name Ltd."
              value={config.companyName}
              onChange={e => handleChange('companyName', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Logo URL <span className="form-label-optional">(optional — replaces the name in the email header)</span>
            </label>
            <input
              className="form-input"
              type="text"
              placeholder="https://example.com/logo.png"
              value={config.logoUrl}
              onChange={e => handleChange('logoUrl', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SMTP */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h2>SMTP - Outgoing Email</h2>
          <p>Server for sending outgoing emails (notifications, ticket replies).</p>
        </div>
        <div className="settings-grid-2">
          <div className="form-group">
            <label className="form-label">SMTP Host</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. smtp.gmail.com"
              value={config.smtpHost}
              onChange={e => handleChange('smtpHost', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Port</label>
            <input
              className="form-input"
              type="number"
              value={config.smtpPort}
              onChange={e => handleChange('smtpPort', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Secure Connection (SSL/TLS)</label>
            <select
              className="form-input form-select"
              value={config.smtpSecure}
              onChange={e => handleChange('smtpSecure', e.target.value)}
            >
              <option value="false">No (STARTTLS - port 587)</option>
              <option value="true">Yes (SSL/TLS - port 465)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Sender Address (From)</label>
            <input
              className="form-input"
              type="email"
              placeholder="e.g. noreply@company.com"
              value={config.smtpFrom}
              onChange={e => handleChange('smtpFrom', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">SMTP User</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. user@company.com"
              value={config.smtpUser}
              onChange={e => handleChange('smtpUser', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">SMTP Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Password"
              value={config.smtpPassword}
              onChange={e => handleChange('smtpPassword', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-actions">
          {testResult && (
            <span className={`test-result ${testResult.ok ? 'ok' : 'fail'}`}>
              {testResult.ok ? '✓' : '✗'} {testResult.msg}
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test SMTP Connection'}
          </button>
        </div>
      </div>

      {/* IMAP */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h2>IMAP - Incoming Email</h2>
          <p>Server for receiving email replies and automatic ticket creation.</p>
        </div>
        <div className="settings-grid-2">
          <div className="form-group">
            <label className="form-label">IMAP Host</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. imap.gmail.com"
              value={config.imapHost}
              onChange={e => handleChange('imapHost', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Port</label>
            <input
              className="form-input"
              type="number"
              value={config.imapPort}
              onChange={e => handleChange('imapPort', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">IMAP User</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. user@company.com"
              value={config.imapUser}
              onChange={e => handleChange('imapUser', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">IMAP Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Password"
              value={config.imapPassword}
              onChange={e => handleChange('imapPassword', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="settings-save-bar">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default EmailSettings;
