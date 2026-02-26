import React, { useState } from 'react';
import {
  AvatarConfig,
  AvatarPreview,
  DEFAULT_CONFIG,
  MALE_DEFAULT_CONFIG,
  AVATAR_COLORS,
  GENDERS,
  SKIN_TONES,
  FEMALE_HAIR_STYLES,
  MALE_HAIR_STYLES,
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
  BEARD_STYLES,
} from './AvatarSVG';
import './AvatarCreator.css';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface AvatarCreatorProps {
  initialConfig?: string | null;   // JSON string from DB
  onSave: (config: object) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

type Tab = 'look' | 'style' | 'extras';

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomConfig(gender: 'female' | 'male'): AvatarConfig {
  const hairStyles = gender === 'male' ? MALE_HAIR_STYLES : FEMALE_HAIR_STYLES;
  return {
    gender,
    skinTone:   randomItem(SKIN_TONES).id,
    hairStyle:  randomItem(hairStyles).id,
    hairColor:  randomItem(HAIR_COLORS).id,
    eyeColor:   randomItem(EYE_COLORS).id,
    outfit:     randomItem(OUTFITS).id,
    accessory:  randomItem(ACCESSORIES).id,
    expression: randomItem(EXPRESSIONS).id,
    mood:       randomItem(MOODS).id,
    badge:      randomItem(BADGES).id,
    lipstick:   gender === 'male' ? 'none' : randomItem(LIPSTICKS).id,
    blush:      gender === 'male' ? 'none' : randomItem(BLUSHES).id,
    eyelashes:  gender === 'male' ? 'none' : randomItem(EYELASHES_OPTS).id,
    earring:    randomItem(EARRINGS).id,
    nailColor:  gender === 'male' ? 'none' : randomItem(NAIL_COLORS).id,
    beard:      gender === 'male' ? randomItem(BEARD_STYLES).id : 'none',
  };
}

/* ── Option row helper ───────────────────────────────────────────────────── */

function OptRow<T extends { id: string; label: string; emoji?: string; color?: string }>({
  label, items, value, onChange,
}: {
  label: string;
  items: T[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="ac-row">
      <span className="ac-row-label">{label}</span>
      <div className="ac-opts">
        {items.map(item => (
          <button
            key={item.id}
            className={`ac-opt-btn${value === item.id ? ' active' : ''}`}
            onClick={() => onChange(item.id)}
            title={item.label}
          >
            {item.color && (
              <span
                className="ac-swatch"
                style={{ background: item.color || '#888', border: '1px solid #aaa', width: 18, height: 18 }}
              />
            )}
            {item.emoji && <span className="ac-opt-emoji">{item.emoji}</span>}
            <span className="ac-opt-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────────────── */

const AvatarCreator: React.FC<AvatarCreatorProps> = ({
  initialConfig,
  onSave,
  onRemove,
  onClose,
}) => {
  const [tab, setTab] = useState<Tab>('look');
  const [saving, setSaving] = useState(false);
  const [avatarColor, setAvatarColor] = useState<string>(() => {
    if (initialConfig) {
      try {
        const c = JSON.parse(initialConfig);
        if (c.avatarColor) return c.avatarColor;
      } catch { /* ignore */ }
    }
    return '#DB2777';
  });
  const [config, setConfig] = useState<AvatarConfig>(() => {
    if (initialConfig) {
      try {
        const c = JSON.parse(initialConfig);
        if (c.skinTone) {
          // Ensure gender field exists for old configs
          return { ...DEFAULT_CONFIG, ...c, gender: c.gender ?? 'female', beard: c.beard ?? 'none' };
        }
      } catch { /* ignore */ }
    }
    return { ...DEFAULT_CONFIG };
  });

  const patch = (key: keyof AvatarConfig, val: string) =>
    setConfig(c => ({ ...c, [key]: val }));

  const handleGenderSwitch = (g: 'female' | 'male') => {
    if (g === config.gender) return;
    const base = g === 'male' ? MALE_DEFAULT_CONFIG : DEFAULT_CONFIG;
    // Keep personal choices that make sense for both
    setConfig(c => ({
      ...base,
      skinTone:  c.skinTone,
      hairColor: c.hairColor,
      eyeColor:  c.eyeColor,
      mood:      c.mood,
      expression: c.expression,
      badge:     c.badge,
      accessory: c.accessory,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...config, avatarColor });
    } finally {
      setSaving(false);
    }
  };

  const isMale = config.gender === 'male';
  const hairStyles = isMale ? MALE_HAIR_STYLES : FEMALE_HAIR_STYLES;

  return (
    <div className="ac-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ac-modal">

        {/* Header */}
        <div className="ac-header">
          <span className="ac-title">Create your avatar</span>
          <button className="ac-close" onClick={onClose}>×</button>
        </div>

        {/* Gender toggle */}
        <div className="ac-gender-row">
          {GENDERS.map(g => (
            <button
              key={g.id}
              className={`ac-gender-btn${config.gender === g.id ? ' active' : ''}`}
              onClick={() => handleGenderSwitch(g.id as 'female' | 'male')}
            >
              <span>{g.emoji}</span> {g.label}
            </button>
          ))}
        </div>

        {/* Live preview */}
        <div className="ac-preview-area">
          <AvatarPreview config={config} color={avatarColor} size={100} />
          <div className="ac-swatches">
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                className={`ac-swatch${avatarColor === c ? ' active' : ''}`}
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
              className="ac-swatch"
              style={{ padding: 0, cursor: 'pointer' }}
            />
          </div>
          <button className="ac-random-btn" onClick={() => setConfig(randomConfig(config.gender))}>
            Random
          </button>
        </div>

        {/* Tabs */}
        <div className="ac-tabs">
          {([
            { id: 'look',   label: 'Look' },
            { id: 'style',  label: 'Style' },
            { id: 'extras', label: isMale ? 'Extras' : 'Makeup' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              className={`ac-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="ac-section-body">
          {tab === 'look' && (
            <div className="ac-section">
              <OptRow
                label="Skin tone"
                items={SKIN_TONES.map(s => ({ ...s, emoji: undefined }))}
                value={config.skinTone}
                onChange={v => patch('skinTone', v)}
              />
              <OptRow
                label="Hair style"
                items={hairStyles}
                value={config.hairStyle}
                onChange={v => patch('hairStyle', v)}
              />
              <div className="ac-row">
                <span className="ac-row-label">Hair color</span>
                <div className="ac-swatches ac-swatches--lg">
                  {HAIR_COLORS.map(c => (
                    <button
                      key={c.id}
                      className={`ac-swatch${config.hairColor === c.id ? ' active' : ''}`}
                      style={{ background: c.id, border: '1px solid #aaa' }}
                      title={c.label}
                      onClick={() => patch('hairColor', c.id)}
                    />
                  ))}
                </div>
              </div>
              <OptRow
                label="Eye color"
                items={EYE_COLORS.map(e => ({ ...e, emoji: undefined }))}
                value={config.eyeColor}
                onChange={v => patch('eyeColor', v)}
              />
            </div>
          )}

          {tab === 'style' && (
            <div className="ac-section">
              <OptRow
                label="Outfit"
                items={OUTFITS}
                value={config.outfit}
                onChange={v => patch('outfit', v)}
              />
              <OptRow
                label="Accessory"
                items={ACCESSORIES}
                value={config.accessory}
                onChange={v => patch('accessory', v)}
              />
              <OptRow
                label="Expression"
                items={EXPRESSIONS}
                value={config.expression}
                onChange={v => patch('expression', v)}
              />
              <OptRow
                label="Mood"
                items={MOODS.map(m => ({ ...m, color: undefined, emoji: m.emoji + ' ' }))}
                value={config.mood}
                onChange={v => patch('mood', v)}
              />
              <OptRow
                label="Badge"
                items={BADGES.map(b => ({ ...b, emoji: b.emoji || '✖️' }))}
                value={config.badge}
                onChange={v => patch('badge', v)}
              />
              {/* Beard — male only */}
              {isMale && (
                <OptRow
                  label="Beard"
                  items={BEARD_STYLES}
                  value={config.beard}
                  onChange={v => patch('beard', v)}
                />
              )}
            </div>
          )}

          {tab === 'extras' && (
            <div className="ac-section">
              {!isMale && (
                <>
                  <div className="ac-row">
                    <span className="ac-row-label">Lipstick</span>
                    <div className="ac-swatches ac-swatches--lg">
                      {LIPSTICKS.map(l => (
                        <button
                          key={l.id}
                          className={`ac-swatch${config.lipstick === l.id ? ' active' : ''}`}
                          style={{ background: l.color || '#e0e0e0', border: '1px solid #aaa', opacity: l.color ? 1 : 0.4 }}
                          title={l.label}
                          onClick={() => patch('lipstick', l.id)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="ac-row">
                    <span className="ac-row-label">Blush</span>
                    <div className="ac-swatches ac-swatches--lg">
                      {BLUSHES.map(b => (
                        <button
                          key={b.id}
                          className={`ac-swatch${config.blush === b.id ? ' active' : ''}`}
                          style={{ background: b.color || '#e0e0e0', border: '1px solid #aaa', opacity: b.color ? 1 : 0.4 }}
                          title={b.label}
                          onClick={() => patch('blush', b.id)}
                        />
                      ))}
                    </div>
                  </div>
                  <OptRow
                    label="Eyelashes"
                    items={EYELASHES_OPTS}
                    value={config.eyelashes}
                    onChange={v => patch('eyelashes', v)}
                  />
                  <div className="ac-row">
                    <span className="ac-row-label">Nail color</span>
                    <div className="ac-swatches ac-swatches--lg">
                      {NAIL_COLORS.map(n => (
                        <button
                          key={n.id}
                          className={`ac-swatch${config.nailColor === n.id ? ' active' : ''}`}
                          style={{ background: n.color, border: '1px solid #aaa' }}
                          title={n.label}
                          onClick={() => patch('nailColor', n.id)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
              <OptRow
                label="Earrings"
                items={EARRINGS}
                value={config.earring}
                onChange={v => patch('earring', v)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ac-footer">
          <button className="ac-remove-btn" onClick={onRemove}>
            Remove avatar
          </button>
          <div className="ac-footer-right">
            <button className="ac-cancel-btn" onClick={onClose}>Cancel</button>
            <button
              className="ac-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save avatar'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AvatarCreator;
