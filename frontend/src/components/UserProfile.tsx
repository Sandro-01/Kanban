import React, { useRef, useState } from 'react';
import { users as usersApi } from '../services/api';
import './UserProfile.css';

interface UserProfileProps {
  user: any;
  onUserUpdate?: (updatedUser: any) => void;
}

const AVATAR_COLORS = [
  '#4F46E5', '#7C3AED', '#DB2777', '#DC2626',
  '#D97706', '#059669', '#0891B2', '#0284C7',
  '#6D28D9', '#BE185D', '#B45309', '#047857',
];

function getInitials(user: any): string {
  const f = (user?.firstName ?? '')[0] ?? '';
  const l = (user?.lastName ?? '')[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUserUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    jobTitle: user.jobTitle ?? '',
    department: user.department ?? '',
    phone: user.phone ?? '',
    location: user.location ?? '',
    bio: user.bio ?? '',
  });

  const [avatarColor, setAvatarColor] = useState(user.avatarColor ?? '#4F46E5');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? null);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const res = await usersApi.uploadAvatar(user.id, file);
      const newUrl = res.data.avatarUrl;
      setAvatarUrl(newUrl);
      onUserUpdate?.({ ...user, avatarUrl: newUrl });
    } catch (e) {
      alert('Errore caricamento foto');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await usersApi.removeAvatar(user.id);
      setAvatarUrl(null);
      onUserUpdate?.({ ...user, avatarUrl: null });
    } catch {
      alert('Errore rimozione foto');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, avatarColor };
      const res = await usersApi.update(user.id, payload);
      onUserUpdate?.({ ...user, ...res.data });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('Errore salvataggio profilo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="up-page">
      <div className="up-card">

        {/* ── Avatar Section ── */}
        <div className="up-avatar-section">
          <div className="up-avatar-wrap">
            <div
              className="up-avatar-circle"
              style={{ background: avatarUrl ? undefined : avatarColor }}
              onClick={() => fileInputRef.current?.click()}
              title="Clicca per cambiare foto"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="up-avatar-img" />
              ) : (
                <span className="up-avatar-initials">{getInitials(user)}</span>
              )}
              <div className="up-avatar-overlay">
                {uploading ? '⏳' : '📷'}
              </div>
            </div>

            {avatarUrl && (
              <button className="up-remove-photo" onClick={handleRemovePhoto} title="Rimuovi foto">✕</button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); e.target.value = ''; }}
          />

          <p className="up-avatar-hint">Clicca sull'immagine per cambiare la foto</p>

          {/* Color picker — shown only when no photo */}
          {!avatarUrl && (
            <div className="up-color-picker">
              <p className="up-color-label">Colore sfondo</p>
              <div className="up-color-swatches">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    className={`up-color-swatch ${avatarColor === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setAvatarColor(c)}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Info Section ── */}
        <div className="up-form">
          <h2 className="up-name">{user.firstName} {user.lastName}</h2>
          {user.department && <p className="up-dept">{user.jobTitle || user.role} · {user.department}</p>}

          <div className="up-divider" />

          <div className="up-fields">
            <div className="up-row">
              <div className="up-field">
                <label>Nome</label>
                <input className="input" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} />
              </div>
              <div className="up-field">
                <label>Cognome</label>
                <input className="input" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} />
              </div>
            </div>

            <div className="up-row">
              <div className="up-field">
                <label>Ruolo / Titolo</label>
                <input className="input" placeholder="es. IT Specialist" value={form.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} />
              </div>
              <div className="up-field">
                <label>Reparto</label>
                <input className="input" placeholder="es. IT" value={form.department} onChange={e => handleChange('department', e.target.value)} disabled={user.role !== 'ADMIN'} />
              </div>
            </div>

            <div className="up-row">
              <div className="up-field">
                <label>Telefono</label>
                <input className="input" placeholder="+39 000 000 0000" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
              </div>
              <div className="up-field">
                <label>Sede / Posizione</label>
                <input className="input" placeholder="es. Milano" value={form.location} onChange={e => handleChange('location', e.target.value)} />
              </div>
            </div>

            <div className="up-field up-field--full">
              <label>Bio</label>
              <textarea className="input" rows={3} placeholder="Scrivi qualcosa su di te..." value={form.bio} onChange={e => handleChange('bio', e.target.value)} />
            </div>
          </div>

          <div className="up-actions">
            <button className="btn btn-primary up-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvataggio...' : saved ? '✓ Salvato' : 'Salva modifiche'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserProfile;
