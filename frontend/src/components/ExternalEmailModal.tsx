import React, { useState, useCallback } from 'react';
import { tickets as ticketsApi } from '../services/api';
import RichTextEditor from './RichTextEditor';
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
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePasteFiles = useCallback((pastedFiles: File[]) => {
    setNewFiles(prev => [...prev, ...pastedFiles]);
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      setLoading(true);
      await ticketsApi.addExternalContacts(ticket.id, [newEmail.trim()]);
      alert('Contact added successfully!');
      setNewEmail('');
      onSuccess();
    } catch (error: any) {
      console.error('Error adding contact:', error);
      alert(error.response?.data?.error || 'Error adding contact');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContact = async (email: string) => {
    if (!window.confirm(`Remove ${email} from contacts?`)) return;

    try {
      setLoading(true);
      await ticketsApi.removeExternalContact(ticket.id, email);
      alert('Contact removed successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error removing contact:', error);
      alert(error.response?.data?.error || 'Error removing contact');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim() || selectedEmails.length === 0) {
      alert('Please fill in all fields and select at least one recipient');
      return;
    }

    try {
      setLoading(true);

      // Upload new files before sending
      const allAttachmentIds = [...selectedAttachments];
      for (const file of newFiles) {
        const res = await ticketsApi.uploadFile(ticket.id, file);
        if (res.data?.id) allAttachmentIds.push(res.data.id);
      }

      await ticketsApi.sendEmail(ticket.id, {
        subject: emailSubject,
        body: emailBody,
        toEmails: selectedEmails,
        attachmentIds: allAttachmentIds.length > 0 ? allAttachmentIds : undefined,
      });

      const totalAttachments = allAttachmentIds.length;
      const attachmentMsg = totalAttachments > 0
        ? ` with ${totalAttachments} attachment(s)`
        : '';
      alert(`Email sent successfully${attachmentMsg}!`);

      setEmailSubject('');
      setEmailBody('');
      setSelectedEmails([]);
      setSelectedAttachments([]);
      setNewFiles([]);
      setMode('manage');
      onSuccess();
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert(error.response?.data?.error || 'Error sending email');
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

  const toggleAttachmentSelection = (attachmentId: string) => {
    if (selectedAttachments.includes(attachmentId)) {
      setSelectedAttachments(selectedAttachments.filter((id) => id !== attachmentId));
    } else {
      setSelectedAttachments([...selectedAttachments, attachmentId]);
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
            📧 External Communications - Ticket #{ticket.id.slice(0, 8)}
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
              👥 Manage Contacts
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
              ✉️ Send Email
            </button>
          </div>

          {mode === 'manage' && (
            <div>
              <div className="alert" style={{ marginBottom: '20px', backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '6px', padding: '12px' }}>
                <strong>ℹ️ External Communications</strong>
                <br />
                <span style={{ fontSize: '14px' }}>
                  Add email addresses of suppliers, customers or external partners. You can send them updates and their replies will be automatically linked to this ticket.
                </span>
              </div>

              {/* Add contact form */}
              <form onSubmit={handleAddContact} style={{ marginBottom: '20px' }}>
                <label className="label">Add External Contact</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="email"
                    className="input"
                    placeholder="e.g. supplier@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !newEmail.trim()}
                  >
                    ➕ Add
                  </button>
                </div>
              </form>

              {/* Contacts list */}
              <div>
                <label className="label">
                  External Contacts ({ticket.externalContacts?.length || 0})
                </label>
                {!ticket.externalContacts || ticket.externalContacts.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '6px' }}>
                    No external contacts added
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
                          🗑️ Remove
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
                <strong>✉️ Send Email</strong>
                <br />
                <span style={{ fontSize: '14px' }}>
                  The email will automatically include the ticket reference. Replies will be added as comments to the ticket.
                </span>
              </div>

              {/* Recipient selection */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="label">Recipients *</label>
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

              {/* Subject */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="label">Subject *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Information request"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                />
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  The ticket reference will be added automatically
                </small>
              </div>

              {/* Message */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="label">Message *</label>
                <RichTextEditor
                  value={emailBody}
                  onChange={setEmailBody}
                  placeholder="Write your message... (you can paste screenshots)"
                  minHeight={150}
                  onPasteFiles={handlePasteFiles}
                />
              </div>

              {/* Upload new attachments */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="label">📎 Add New Attachments</label>
                <div>
                  <input
                    type="file"
                    id="ext-email-new-file-upload"
                    multiple
                    onChange={(e) => {
                      const selected = e.target.files ? Array.from(e.target.files) : [];
                      setNewFiles(prev => [...prev, ...selected]);
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="ext-email-new-file-upload" style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    background: '#f3f4f6',
                    border: '1px dashed #9ca3af',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#4b5563',
                    textAlign: 'center',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}>
                    {newFiles.length > 0
                      ? `📎 ${newFiles.length} new file(s) — click to add more`
                      : '📎 Click to attach new files'}
                  </label>
                  {newFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {newFiles.map((f, i) => (
                        <span key={i} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', background: '#dbeafe', borderRadius: '12px',
                          fontSize: '12px', color: '#1e40af',
                        }}>
                          {f.name}
                          <button
                            onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))}
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', fontWeight: 'bold', padding: '0 2px' }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Attachment selection */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="label">
                    📎 Attachments to Include ({selectedAttachments.length}/{ticket.attachments.length})
                  </label>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
                    Select ticket attachments to include in the email
                  </div>
                  {ticket.attachments.filter((att: any) => !att.isDeleted).map((attachment: any) => (
                    <label
                      key={attachment.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px',
                        background: selectedAttachments.includes(attachment.id) ? '#dbeafe' : '#f9fafb',
                        border: `1px solid ${selectedAttachments.includes(attachment.id) ? '#3b82f6' : '#e5e7eb'}`,
                        borderRadius: '6px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={selectedAttachments.includes(attachment.id)}
                          onChange={() => toggleAttachmentSelection(attachment.id)}
                          style={{ marginRight: '10px', width: '18px', height: '18px' }}
                        />
                        <div>
                          <div style={{ fontWeight: '500' }}>📄 {attachment.fileName}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {(attachment.fileSize / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMode('manage')}
                  disabled={loading}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || selectedEmails.length === 0}
                >
                  {loading ? 'Sending...' : '📤 Send Email'}
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
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExternalEmailModal;
