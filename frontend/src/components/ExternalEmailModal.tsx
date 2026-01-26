import React, { useState } from 'react';
import { tickets as ticketsApi } from '../services/api';
import './ProcessList.css';

interface ExternalEmailModalProps {
  ticket: any;
  onClose: () => void;
  onSuccess: () => void;
}

const ExternalEmailModal: React.FC<ExternalEmailModalProps> = ({
  ticket,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'manage' | 'send'>('manage');
  const [newEmail, setNewEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      setLoading(true);
      await ticketsApi.addExternalContacts(ticket.id, [newEmail.trim()]);
      alert('Contatto aggiunto con successo!');
      setNewEmail('');
      onSuccess();
    } catch (error: any) {
      console.error('Errore aggiunta contatto:', error);
      alert(error.response?.data?.error || 'Errore durante l\'aggiunta del contatto');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContact = async (email: string) => {
    if (!window.confirm(`Rimuovere ${email} dai contatti?`)) return;

    try {
      setLoading(true);
      await ticketsApi.removeExternalContact(ticket.id, email);
      alert('Contatto rimosso con successo!');
      onSuccess();
    } catch (error: any) {
      console.error('Errore rimozione contatto:', error);
      alert(error.response?.data?.error || 'Errore durante la rimozione del contatto');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim() || selectedEmails.length === 0) {
      alert('Compila tutti i campi e seleziona almeno un destinatario');
      return;
    }

    try {
      setLoading(true);
      await ticketsApi.sendEmail(ticket.id, {
        subject: emailSubject,
        body: emailBody,
        toEmails: selectedEmails,
      });
      alert('Email inviata con successo!');
      setEmailSubject('');
      setEmailBody('');
      setSelectedEmails([]);
      setMode('manage');
      onSuccess();
    } catch (error: any) {
      console.error('Errore invio email:', error);
      alert(error.response?.data?.error || 'Errore durante l\'invio dell\'email');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailSelection = (email: string) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter((e) => e !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <h2>
            📧 Comunicazioni Esterne - Ticket #{ticket.id.slice(0, 8)}
          </h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
            <button
              onClick={() => setMode('manage')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: mode === 'manage' ? '#3b82f6' : 'transparent',
                color: mode === 'manage' ? 'white' : '#6b7280',
                fontWeight: mode === 'manage' ? '600' : 'normal',
                cursor: 'pointer',
                borderRadius: '6px 6px 0 0',
              }}
            >
              👥 Gestisci Contatti
            </button>
            <button
              onClick={() => setMode('send')}
              disabled={!ticket.externalContacts || ticket.externalContacts.length === 0}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: mode === 'send' ? '#3b82f6' : 'transparent',
                color: mode === 'send' ? 'white' : '#6b7280',
                fontWeight: mode === 'send' ? '600' : 'normal',
                cursor: ticket.externalContacts?.length > 0 ? 'pointer' : 'not-allowed',
                borderRadius: '6px 6px 0 0',
                opacity: ticket.externalContacts?.length > 0 ? 1 : 0.5,
              }}
            >
              ✉️ Invia Email
            </button>
          </div>

          {mode === 'manage' && (
            <div>
              <div className="alert" style={{ marginBottom: '20px', backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '6px', padding: '12px' }}>
                <strong>ℹ️ Comunicazioni Esterne</strong>
                <br />
                <span style={{ fontSize: '14px' }}>
                  Aggiungi indirizzi email di fornitori, clienti o partner esterni. Potrai inviare loro aggiornamenti e le risposte verranno automaticamente collegate a questo ticket.
                </span>
              </div>

              {/* Form aggiungi contatto */}
              <form onSubmit={handleAddContact} style={{ marginBottom: '20px' }}>
                <label className="label">Aggiungi Contatto Esterno</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="email"
                    className="input"
                    placeholder="es. fornitore@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !newEmail.trim()}
                  >
                    ➕ Aggiungi
                  </button>
                </div>
              </form>

              {/* Lista contatti */}
              <div>
                <label className="label">
                  Contatti Esterni ({ticket.externalContacts?.length || 0})
                </label>
                {!ticket.externalContacts || ticket.externalContacts.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '6px' }}>
                    Nessun contatto esterno aggiunto
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {ticket.externalContacts.map((email: string) => (
                      <div
                        key={email}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px',
                          background: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                        }}
                      >
                        <span style={{ fontWeight: '500' }}>📧 {email}</span>
                        <button
                          onClick={() => handleRemoveContact(email)}
                          disabled={loading}
                          style={{
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          🗑️ Rimuovi
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'send' && (
            <form onSubmit={handleSendEmail}>
              <div className="alert" style={{ marginBottom: '20px', backgroundColor: '#dcfce7', border: '1px solid #10b981', borderRadius: '6px', padding: '12px' }}>
                <strong>✉️ Invia Email</strong>
                <br />
                <span style={{ fontSize: '14px' }}>
                  L'email includerà automaticamente il riferimento al ticket. Le risposte verranno aggiunte come commenti al ticket.
                </span>
              </div>

              {/* Selezione destinatari */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="label">Destinatari *</label>
                {ticket.externalContacts.map((email: string) => (
                  <label
                    key={email}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px',
                      background: selectedEmails.includes(email) ? '#dbeafe' : '#f9fafb',
                      border: `1px solid ${selectedEmails.includes(email) ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(email)}
                      onChange={() => toggleEmailSelection(email)}
                      style={{ marginRight: '10px', width: '18px', height: '18px' }}
                    />
                    <span>{email}</span>
                  </label>
                ))}
              </div>

              {/* Oggetto */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="label">Oggetto *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="es. Richiesta informazioni"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                />
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Il riferimento ticket verrà aggiunto automaticamente
                </small>
              </div>

              {/* Messaggio */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="label">Messaggio *</label>
                <textarea
                  className="input"
                  placeholder="Scrivi il tuo messaggio..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMode('manage')}
                  disabled={loading}
                >
                  ← Indietro
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || selectedEmails.length === 0}
                >
                  {loading ? 'Invio...' : '📤 Invia Email'}
                </button>
              </div>
            </form>
          )}

          {mode === 'manage' && (
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Chiudi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExternalEmailModal;
