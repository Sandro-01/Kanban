import React, { useState } from 'react';
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
import './AvatarCreator.css';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface AvatarCreatorProps {
  initialConfig?: string | null;   // JSON string from DB
  onSave: (config: object) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

type Tab = 'aspetto' | 'stile' | 'makeup';

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomConfig(): AvatarConfig {
  return {
    skinTone:   randomItem(SKIN_TONES).id,
    hairStyle:  randomItem(HAIR_STYLES).id,
    hairColor:  randomItem(HAIR_COLORS).id,
    eyeColor:   randomItem(EYE_COLORS).id,
    outfit:     randomItem(OUTFITS).id,
    accessory:  randomItem(ACCESSORIES).id,
    expression: randomItem(EXPRESSIONS).id,
    mood:       randomItem(MOODS).id,
    badge:      randomItem(BADGES).id,
    lipstick:   randomItem(LIPSTICKS).id,
    blush:      randomItem(BLUSHES).id,
    eyelashes:  randomItem(EYELASHES_OPTS).id,
    earring:    randomItem(EARRINGS).id,
    nailColor:  randomItem(NAIL_COLORS).id,
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
  const [tab, setTab] = useState<Tab>('aspetto');
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
        if (c.skinTone) return { ...DEFAULT_CONFIG, ...c };
      } catch { /* ignore */ }
    }
    return { ...DEFAULT_CONFIG };
  });

  const patch = (key: keyof AvatarConfig, val: string) =>
    setConfig(c => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...config, avatarColor });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ac-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ac-modal">

        {/* Header */}
        <div className="ac-header">
          <span className="ac-title">Crea il tuo avatar</span>
          <button className="ac-close" onClick={onClose}>×</button>
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
          <button className="ac-random-btn" onClick={() => setConfig(randomConfig())}>
            Casuale
          </button>
        </div>

        {/* Tabs */}
        <div className="ac-tabs">
          {([
            { id: 'aspetto', label: 'Aspetto' },
            { id: 'stile',   label: 'Stile' },
            { id: 'makeup',  label: 'Makeup' },
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
          {tab === 'aspetto' && (
            <div className="ac-section">
              <OptRow
                label="Carnagione"
                items={SKIN_TONES.map(s => ({ ...s, emoji: undefined }))}
                value={config.skinTone}
                onChange={v => patch('skinTone', v)}
              />
              <OptRow
                label="Acconciatura"
                items={HAIR_STYLES}
                value={config.hairStyle}
                onChange={v => patch('hairStyle', v)}
              />
              <div className="ac-row">
                <span className="ac-row-label">Colore capelli</span>
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
                label="Colore occhi"
                items={EYE_COLORS.map(e => ({ ...e, emoji: undefined }))}
                value={config.eyeColor}
                onChange={v => patch('eyeColor', v)}
              />
            </div>
          )}

          {tab === 'stile' && (
            <div className="ac-section">
              <OptRow
                label="Abbigliamento"
                items={OUTFITS}
                value={config.outfit}
                onChange={v => patch('outfit', v)}
              />
              <OptRow
                label="Accessorio"
                items={ACCESSORIES}
                value={config.accessory}
                onChange={v => patch('accessory', v)}
              />
              <OptRow
                label="Espressione"
                items={EXPRESSIONS}
                value={config.expression}
                onChange={v => patch('expression', v)}
              />
              <OptRow
                label="Stato d'animo"
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
            </div>
          )}

          {tab === 'makeup' && (
            <div className="ac-section">
              <div className="ac-row">
                <span className="ac-row-label">Rossetto</span>
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
                label="Ciglia"
                items={EYELASHES_OPTS}
                value={config.eyelashes}
                onChange={v => patch('eyelashes', v)}
              />
              <OptRow
                label="Orecchini"
                items={EARRINGS}
                value={config.earring}
                onChange={v => patch('earring', v)}
              />
              <div className="ac-row">
                <span className="ac-row-label">Smalto</span>
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ac-footer">
          <button className="ac-remove-btn" onClick={onRemove}>
            Rimuovi avatar
          </button>
          <div className="ac-footer-right">
            <button className="ac-cancel-btn" onClick={onClose}>Annulla</button>
            <button
              className="ac-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvataggio...' : 'Salva avatar'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AvatarCreator;
