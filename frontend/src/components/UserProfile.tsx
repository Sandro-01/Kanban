import React, { useState } from 'react';
import { users as usersApi } from '../services/api';
import {
  AvatarConfig,
  AvatarPreview,
  DEFAULT_CONFIG,
  AVATAR_COLORS,
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  EYE_COLORS,
  OUTFITS,
  ACCESSORIES,
  EXPRESSIONS,
  MOODS,
  BADGES,
  LIPSTICKS,
  BLUSHES,
  EYELASHES_OPTS,
  EARRINGS,
  NAIL_COLORS,
} from './AvatarSVG';
import './UserProfile.css';

interface UserProfileProps {
  user: any;
  onUserUpdate?: (updatedUser: any) => void;
}

// ─── Section picker helper ────────────────────────────────────────────────────

function PickerSection<T extends { id: string; label: string; emoji?: string; color?: string }>(props: {
  title: string;
  items: T[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="picker-section">
      <h4>{props.title}</h4>
      <div className="picker-grid">
        {props.items.map(item => (
          <button
            key={item.id}
            className={`picker-btn ${props.value === item.id ? 'active' : ''}`}
            onClick={() => props.onChange(item.id)}
            title={item.label}
          >
            {item.emoji && <span>{item.emoji}</span>}
            {item.color && (
              <span className="color-dot" style={{ background: item.color }} />
            )}
            <span className="picker-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const UserProfile: React.FC<UserProfileProps> = ({ user, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'avatar' | 'makeup' | 'profile' | 'preferences'>('avatar');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [avatarColor, setAvatarColor] = useState<string>(user?.avatarColor ?? '#DB2777');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    const base = user?.avatarConfig ?? {};
    return { ...DEFAULT_CONFIG, ...base };
  });

  const [profile, setProfile] = useState({
    firstName:  user?.firstName  ?? '',
    lastName:   user?.lastName   ?? '',
    department: user?.department ?? '',
    jobTitle:   user?.jobTitle   ?? '',
    phone:      user?.phone      ?? '',
    location:   user?.location   ?? '',
    bio:        user?.bio        ?? '',
  });

  const [prefs, setPrefs] = useState({
    theme:    user?.theme    ?? 'dark',
    language: user?.language ?? 'it',
  });

  const patchConfig = (key: keyof AvatarConfig, val: string) =>
    setAvatarConfig(c => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...profile,
        avatarColor,
        avatarConfig,
        theme:    prefs.theme,
        language: prefs.language,
      };
      const { data } = await usersApi.update(user.id, payload);
      setSaved(true);
      onUserUpdate?.(data);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert('Errore nel salvataggio: ' + (err?.response?.data?.error ?? err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-profile-page">
      <div className="profile-header">
        <h2>Personalizzazione Profilo</h2>
        <p className="profile-subtitle">Crea il tuo personaggio unico 💖</p>
      </div>

      <div className="profile-layout">
        {/* ── Left Panel: Live Preview ── */}
        <div className="profile-preview-panel">
          <div className="avatar-showcase">
            <AvatarPreview config={avatarConfig} color={avatarColor} size={160} />
            <div className="avatar-name">
              {profile.firstName || user.firstName} {profile.lastName || user.lastName}
            </div>
            <div className="avatar-role">
              {profile.jobTitle || user.jobTitle || user.role}
              {(profile.department || user.department) && (
                <span className="avatar-dept"> · {profile.department || user.department}</span>
              )}
            </div>
            <div className="avatar-mood">
              {MOODS.find(m => m.id === avatarConfig.mood)?.emoji}{' '}
              <span style={{ color: MOODS.find(m => m.id === avatarConfig.mood)?.color }}>
                {MOODS.find(m => m.id === avatarConfig.mood)?.label}
              </span>
            </div>
          </div>

          <div className="avatar-color-picker">
            <h4>Colore sfondo</h4>
            <div className="color-swatches">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  className={`swatch ${avatarColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setAvatarColor(c)}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={avatarColor}
                onChange={e => setAvatarColor(e.target.value)}
                title="Colore personalizzato"
                className="swatch swatch-custom"
              />
            </div>
          </div>

          <button
            className={`btn-save ${saved ? 'saved' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvataggio...' : saved ? '✓ Salvato!' : 'Salva Profilo'}
          </button>
        </div>

        {/* ── Right Panel: Tabs ── */}
        <div className="profile-editor-panel">
          <div className="profile-tabs">
            <button className={`tab ${activeTab === 'avatar' ? 'active' : ''}`} onClick={() => setActiveTab('avatar')}>
              🎮 Aspetto
            </button>
            <button className={`tab ${activeTab === 'makeup' ? 'active' : ''}`} onClick={() => setActiveTab('makeup')}>
              💄 Makeup
            </button>
            <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              👤 Profilo
            </button>
            <button className={`tab ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}>
              ⚙️ Preferenze
            </button>
          </div>

          {activeTab === 'avatar' && (
            <div className="tab-content avatar-tab">
              <PickerSection
                title="Carnagione"
                items={SKIN_TONES.map(s => ({ ...s, emoji: '' }))}
                value={avatarConfig.skinTone}
                onChange={v => patchConfig('skinTone', v)}
              />

              <PickerSection
                title="Acconciatura"
                items={HAIR_STYLES}
                value={avatarConfig.hairStyle}
                onChange={v => patchConfig('hairStyle', v)}
              />

              <div className="picker-section">
                <h4>Colore capelli</h4>
                <div className="picker-grid">
                  {HAIR_COLORS.map(c => (
                    <button
                      key={c.id}
                      className={`picker-btn color-btn ${avatarConfig.hairColor === c.id ? 'active' : ''}`}
                      onClick={() => patchConfig('hairColor', c.id)}
                      title={c.label}
                    >
                      <span className="color-dot big" style={{ background: c.id, border: '1px solid #555' }} />
                      <span className="picker-label">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <PickerSection
                title="Colore occhi"
                items={EYE_COLORS.map(e => ({ ...e, emoji: '' }))}
                value={avatarConfig.eyeColor}
                onChange={v => patchConfig('eyeColor', v)}
              />

              <PickerSection
                title="Abbigliamento"
                items={OUTFITS}
                value={avatarConfig.outfit}
                onChange={v => patchConfig('outfit', v)}
              />

              <PickerSection
                title="Accessorio testa"
                items={ACCESSORIES}
                value={avatarConfig.accessory}
                onChange={v => patchConfig('accessory', v)}
              />

              <PickerSection
                title="Espressione"
                items={EXPRESSIONS}
                value={avatarConfig.expression}
                onChange={v => patchConfig('expression', v)}
              />

              <PickerSection
                title="Stato d'animo"
                items={MOODS.map(m => ({ ...m, color: undefined, emoji: m.emoji + ' ' }))}
                value={avatarConfig.mood}
                onChange={v => patchConfig('mood', v)}
              />

              <PickerSection
                title="Badge"
                items={BADGES.map(b => ({ ...b, emoji: b.emoji || '✖️' }))}
                value={avatarConfig.badge}
                onChange={v => patchConfig('badge', v)}
              />
            </div>
          )}

          {activeTab === 'makeup' && (
            <div className="tab-content avatar-tab">
              <div className="picker-section">
                <h4>Rossetto 💄</h4>
                <div className="picker-grid">
                  {LIPSTICKS.map(l => (
                    <button
                      key={l.id}
                      className={`picker-btn color-btn ${avatarConfig.lipstick === l.id ? 'active' : ''}`}
                      onClick={() => patchConfig('lipstick', l.id)}
                      title={l.label}
                    >
                      <span
                        className="color-dot big"
                        style={{
                          background: l.color || '#888',
                          border: '1px solid #555',
                          opacity: l.color ? 1 : 0.3,
                        }}
                      />
                      <span className="picker-label">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="picker-section">
                <h4>Blush 🌸</h4>
                <div className="picker-grid">
                  {BLUSHES.map(b => (
                    <button
                      key={b.id}
                      className={`picker-btn color-btn ${avatarConfig.blush === b.id ? 'active' : ''}`}
                      onClick={() => patchConfig('blush', b.id)}
                      title={b.label}
                    >
                      <span
                        className="color-dot big"
                        style={{
                          background: b.color || '#888',
                          border: '1px solid #555',
                          opacity: b.color ? 1 : 0.3,
                        }}
                      />
                      <span className="picker-label">{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <PickerSection
                title="Ciglia ✨"
                items={EYELASHES_OPTS}
                value={avatarConfig.eyelashes}
                onChange={v => patchConfig('eyelashes', v)}
              />

              <PickerSection
                title="Orecchini 💎"
                items={EARRINGS}
                value={avatarConfig.earring}
                onChange={v => patchConfig('earring', v)}
              />

              <div className="picker-section">
                <h4>Smalto unghie 💅</h4>
                <div className="picker-grid">
                  {NAIL_COLORS.map(n => (
                    <button
                      key={n.id}
                      className={`picker-btn color-btn ${avatarConfig.nailColor === n.id ? 'active' : ''}`}
                      onClick={() => patchConfig('nailColor', n.id)}
                      title={n.label}
                    >
                      <span className="color-dot big" style={{ background: n.color, border: '1px solid #555' }} />
                      <span className="picker-label">{n.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="tab-content profile-tab">
              <div className="form-row">
                <label>Nome
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                  />
                </label>
                <label>Cognome
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>Reparto / Dipartimento
                  <input
                    type="text"
                    placeholder="es. IT, Marketing, Produzione..."
                    value={profile.department}
                    onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
                  />
                </label>
                <label>Titolo / Ruolo
                  <input
                    type="text"
                    placeholder="es. IT Specialist, Team Lead..."
                    value={profile.jobTitle}
                    onChange={e => setProfile(p => ({ ...p, jobTitle: e.target.value }))}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>Telefono
                  <input
                    type="tel"
                    placeholder="+39 320 000 0000"
                    value={profile.phone}
                    onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  />
                </label>
                <label>Sede / Luogo
                  <input
                    type="text"
                    placeholder="es. Treviso, Milano..."
                    value={profile.location}
                    onChange={e => setProfile(p => ({ ...p, location: e.target.value }))}
                  />
                </label>
              </div>

              <label className="full-width">Biografia / Note
                <textarea
                  placeholder="Descrivi te stesso, le tue competenze, i tuoi interessi..."
                  value={profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  rows={4}
                />
              </label>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="tab-content pref-tab">
              <div className="picker-section">
                <h4>Tema interfaccia</h4>
                <div className="picker-grid">
                  {[
                    { id: 'dark',  label: 'Scuro',  emoji: '🌙' },
                    { id: 'light', label: 'Chiaro', emoji: '☀️' },
                    { id: 'auto',  label: 'Auto',   emoji: '🔄' },
                  ].map(t => (
                    <button
                      key={t.id}
                      className={`picker-btn ${prefs.theme === t.id ? 'active' : ''}`}
                      onClick={() => setPrefs(p => ({ ...p, theme: t.id }))}
                    >
                      <span>{t.emoji}</span>
                      <span className="picker-label">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="picker-section">
                <h4>Lingua</h4>
                <div className="picker-grid">
                  {[
                    { id: 'it', label: 'Italiano', emoji: '🇮🇹' },
                    { id: 'en', label: 'English',  emoji: '🇬🇧' },
                    { id: 'de', label: 'Deutsch',  emoji: '🇩🇪' },
                  ].map(l => (
                    <button
                      key={l.id}
                      className={`picker-btn ${prefs.language === l.id ? 'active' : ''}`}
                      onClick={() => setPrefs(p => ({ ...p, language: l.id }))}
                    >
                      <span>{l.emoji}</span>
                      <span className="picker-label">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
