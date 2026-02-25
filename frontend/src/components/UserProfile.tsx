import React, { useState, useEffect } from 'react';
import { users as usersApi } from '../services/api';
import './UserProfile.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AvatarConfig {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  outfit: string;
  accessory: string;
  expression: string;
  mood: string;
  badge: string;
}

interface UserProfileProps {
  user: any;
  onUserUpdate?: (updatedUser: any) => void;
}

// ─── Config Options ───────────────────────────────────────────────────────────

const SKIN_TONES = [
  { id: 'light',    label: 'Chiara',   color: '#FFDBB4' },
  { id: 'medium',   label: 'Dorata',   color: '#D4956A' },
  { id: 'tan',      label: 'Abbronzata', color: '#C68642' },
  { id: 'dark',     label: 'Scura',    color: '#8D5524' },
  { id: 'deep',     label: 'Profonda', color: '#4A2912' },
];

const HAIR_STYLES = [
  { id: 'short',    label: 'Corto',      emoji: '💇' },
  { id: 'medium',   label: 'Medio',      emoji: '👦' },
  { id: 'long',     label: 'Lungo',      emoji: '👩' },
  { id: 'bun',      label: 'Chignon',    emoji: '👸' },
  { id: 'ponytail', label: 'Coda',       emoji: '🐴' },
  { id: 'curly',    label: 'Ricci',      emoji: '🌀' },
  { id: 'bald',     label: 'Rasato',     emoji: '🧑‍🦲' },
  { id: 'mohawk',   label: 'Mohawk',     emoji: '🦔' },
];

const HAIR_COLORS = [
  { id: '#1a1a1a', label: 'Nero' },
  { id: '#4a3728', label: 'Castano' },
  { id: '#8B6914', label: 'Bruno' },
  { id: '#C8A951', label: 'Biondo' },
  { id: '#D2691E', label: 'Rame' },
  { id: '#E5E5E5', label: 'Grigio' },
  { id: '#FFFFFF', label: 'Bianco' },
  { id: '#FF4444', label: 'Rosso' },
  { id: '#9B59B6', label: 'Viola' },
  { id: '#3498DB', label: 'Blu' },
  { id: '#2ECC71', label: 'Verde' },
  { id: '#FF69B4', label: 'Rosa' },
];

const EYE_COLORS = [
  { id: 'brown',  label: 'Marrone', color: '#8B6914' },
  { id: 'blue',   label: 'Blu',     color: '#4A90D9' },
  { id: 'green',  label: 'Verde',   color: '#2D8653' },
  { id: 'hazel',  label: 'Nocciola', color: '#A0784C' },
  { id: 'gray',   label: 'Grigio',  color: '#8B9DC3' },
  { id: 'black',  label: 'Nero',    color: '#1a1a1a' },
];

const OUTFITS = [
  { id: 'casual',    label: 'Casual',    emoji: '👕' },
  { id: 'formal',    label: 'Formale',   emoji: '👔' },
  { id: 'sport',     label: 'Sport',     emoji: '🏃' },
  { id: 'creative',  label: 'Creativo',  emoji: '🎨' },
  { id: 'tech',      label: 'Tech',      emoji: '💻' },
  { id: 'ninja',     label: 'Ninja',     emoji: '🥷' },
  { id: 'astronaut', label: 'Astronauta', emoji: '👨‍🚀' },
  { id: 'chef',      label: 'Chef',      emoji: '👨‍🍳' },
];

const ACCESSORIES = [
  { id: 'none',       label: 'Nessuno',    emoji: '✖️' },
  { id: 'glasses',    label: 'Occhiali',   emoji: '👓' },
  { id: 'sunglasses', label: 'Occhiali da sole', emoji: '🕶️' },
  { id: 'hat',        label: 'Cappello',   emoji: '🎩' },
  { id: 'cap',        label: 'Berretto',   emoji: '🧢' },
  { id: 'headphones', label: 'Cuffie',     emoji: '🎧' },
  { id: 'crown',      label: 'Corona',     emoji: '👑' },
  { id: 'bowtie',     label: 'Papillon',   emoji: '🎀' },
];

const EXPRESSIONS = [
  { id: 'happy',    label: 'Felice',    emoji: '😄' },
  { id: 'neutral',  label: 'Neutro',    emoji: '😐' },
  { id: 'focused',  label: 'Concentrato', emoji: '🧐' },
  { id: 'excited',  label: 'Entusiasta', emoji: '🤩' },
  { id: 'cool',     label: 'Cool',      emoji: '😎' },
  { id: 'tired',    label: 'Stanco',    emoji: '😴' },
  { id: 'silly',    label: 'Buffo',     emoji: '🤪' },
  { id: 'serious',  label: 'Serio',     emoji: '😤' },
];

const MOODS = [
  { id: 'energized', label: 'Energico',  emoji: '⚡', color: '#F39C12' },
  { id: 'calm',      label: 'Calmo',     emoji: '🌊', color: '#3498DB' },
  { id: 'creative',  label: 'Creativo',  emoji: '🌈', color: '#9B59B6' },
  { id: 'focused',   label: 'Focus',     emoji: '🎯', color: '#E74C3C' },
  { id: 'social',    label: 'Sociale',   emoji: '🎉', color: '#2ECC71' },
  { id: 'zen',       label: 'Zen',       emoji: '🧘', color: '#1ABC9C' },
];

const BADGES = [
  { id: 'none',    label: 'Nessuno',   emoji: '' },
  { id: 'star',    label: 'Stella',    emoji: '⭐' },
  { id: 'fire',    label: 'Fuoco',     emoji: '🔥' },
  { id: 'rocket',  label: 'Razzo',     emoji: '🚀' },
  { id: 'diamond', label: 'Diamante',  emoji: '💎' },
  { id: 'trophy',  label: 'Trofeo',    emoji: '🏆' },
  { id: 'shield',  label: 'Scudo',     emoji: '🛡️' },
  { id: 'lightning', label: 'Fulmine', emoji: '⚡' },
];

const AVATAR_COLORS = [
  '#4F46E5', '#7C3AED', '#DB2777', '#DC2626',
  '#D97706', '#059669', '#0284C7', '#0891B2',
  '#374151', '#1F2937', '#6B21A8', '#166534',
];

const DEFAULT_CONFIG: AvatarConfig = {
  skinTone: 'light',
  hairStyle: 'medium',
  hairColor: '#4a3728',
  eyeColor: 'brown',
  outfit: 'casual',
  accessory: 'none',
  expression: 'happy',
  mood: 'energized',
  badge: 'none',
};

// ─── Avatar SVG Preview ───────────────────────────────────────────────────────

function AvatarPreview({ config, color, size = 120 }: { config: AvatarConfig; color: string; size?: number }) {
  const skin = SKIN_TONES.find(s => s.id === config.skinTone)?.color ?? '#FFDBB4';
  const eye  = EYE_COLORS.find(e => e.id === config.eyeColor)?.color ?? '#8B6914';
  const hair = config.hairColor;
  const expr = EXPRESSIONS.find(e => e.id === config.expression)?.emoji ?? '😄';
  const acc  = ACCESSORIES.find(a => a.id === config.accessory)?.emoji ?? '';
  const badge = BADGES.find(b => b.id === config.badge)?.emoji ?? '';
  const moodColor = MOODS.find(m => m.id === config.mood)?.color ?? '#F39C12';

  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  // Hair paths by style
  const hairPaths: Record<string, React.ReactNode> = {
    bald: null,
    short: <ellipse cx={cx} cy={cy - s * 0.18} rx={s * 0.22} ry={s * 0.12} fill={hair} />,
    medium: <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.18} fill={hair} />,
    long: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.18} fill={hair} />
        <rect x={cx - s * 0.22} y={cy - s * 0.02} width={s * 0.1} height={s * 0.3} rx={4} fill={hair} />
        <rect x={cx + s * 0.12} y={cy - s * 0.02} width={s * 0.1} height={s * 0.3} rx={4} fill={hair} />
      </>
    ),
    bun: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.16} fill={hair} />
        <circle cx={cx} cy={cy - s * 0.34} r={s * 0.08} fill={hair} />
      </>
    ),
    ponytail: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.16} fill={hair} />
        <rect x={cx + s * 0.14} y={cy - s * 0.18} width={s * 0.06} height={s * 0.28} rx={3} fill={hair} />
      </>
    ),
    curly: (
      <>
        {[-0.18, -0.08, 0.02, 0.12].map((dx, i) => (
          <circle key={i} cx={cx + dx * s} cy={cy - s * 0.2} r={s * 0.08} fill={hair} />
        ))}
      </>
    ),
    mohawk: (
      <>
        <rect x={cx - s * 0.04} y={cy - s * 0.38} width={s * 0.08} height={s * 0.22} rx={4} fill={hair} />
      </>
    ),
  };

  return (
    <div className="avatar-preview" style={{ width: s, height: s }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={s * 0.48} fill={color} />

        {/* Neck */}
        <rect x={cx - s * 0.08} y={cy + s * 0.12} width={s * 0.16} height={s * 0.14} fill={skin} />

        {/* Outfit body hint */}
        <ellipse cx={cx} cy={cy + s * 0.38} rx={s * 0.28} ry={s * 0.14} fill={
          config.outfit === 'formal' ? '#2C3E50' :
          config.outfit === 'sport'  ? '#E74C3C' :
          config.outfit === 'creative' ? '#9B59B6' :
          config.outfit === 'tech'   ? '#2980B9' :
          config.outfit === 'ninja'  ? '#1a1a1a' :
          config.outfit === 'astronaut' ? '#BDC3C7' :
          config.outfit === 'chef'   ? '#FFFFFF' :
          '#3498DB'
        } />

        {/* Face */}
        <circle cx={cx} cy={cy - s * 0.04} r={s * 0.22} fill={skin} />

        {/* Hair (behind if applicable) */}
        {hairPaths[config.hairStyle] ?? hairPaths.medium}

        {/* Eyes */}
        <circle cx={cx - s * 0.07} cy={cy - s * 0.06} r={s * 0.035} fill={eye} />
        <circle cx={cx + s * 0.07} cy={cy - s * 0.06} r={s * 0.035} fill={eye} />
        <circle cx={cx - s * 0.065} cy={cy - s * 0.065} r={s * 0.012} fill="white" />
        <circle cx={cx + s * 0.075} cy={cy - s * 0.065} r={s * 0.012} fill="white" />

        {/* Mouth / expression hint */}
        {config.expression === 'happy' || config.expression === 'excited' || config.expression === 'cool' ? (
          <path d={`M ${cx - s * 0.07} ${cy + s * 0.04} Q ${cx} ${cy + s * 0.1} ${cx + s * 0.07} ${cy + s * 0.04}`}
            stroke="#8B6914" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        ) : config.expression === 'neutral' || config.expression === 'focused' || config.expression === 'serious' ? (
          <line x1={cx - s * 0.06} y1={cy + s * 0.06} x2={cx + s * 0.06} y2={cy + s * 0.06}
            stroke="#8B6914" strokeWidth={1.5} strokeLinecap="round" />
        ) : (
          <path d={`M ${cx - s * 0.07} ${cy + s * 0.08} Q ${cx} ${cy + s * 0.03} ${cx + s * 0.07} ${cy + s * 0.08}`}
            stroke="#8B6914" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        )}

        {/* Mood ring */}
        <circle cx={cx} cy={cy} r={s * 0.48} fill="none" stroke={moodColor} strokeWidth={3} opacity={0.6} />
      </svg>

      {/* Emoji overlays */}
      {acc && (
        <span className="avatar-accessory" style={{ fontSize: s * 0.22, top: -s * 0.08, right: -s * 0.04 }}>
          {acc}
        </span>
      )}
      {badge && (
        <span className="avatar-badge" style={{ fontSize: s * 0.18, bottom: 0, right: -s * 0.04 }}>
          {badge}
        </span>
      )}
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<'avatar' | 'profile' | 'preferences'>('avatar');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [avatarColor, setAvatarColor] = useState<string>(user?.avatarColor ?? '#4F46E5');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    const base = user?.avatarConfig ?? {};
    return { ...DEFAULT_CONFIG, ...base };
  });

  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    department: user?.department ?? '',
    jobTitle: user?.jobTitle ?? '',
    phone: user?.phone ?? '',
    location: user?.location ?? '',
    bio: user?.bio ?? '',
  });

  const [prefs, setPrefs] = useState({
    theme: user?.theme ?? 'dark',
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
        theme: prefs.theme,
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
        <p className="profile-subtitle">Crea il tuo personaggio unico — proprio come in The Sims!</p>
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
                title="Accessorio"
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
