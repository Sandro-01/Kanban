import React, { useState } from 'react';
import ReactNiceAvatar, { genConfig, AvatarFullConfig } from 'react-nice-avatar';
import './AvatarCreator.css';

/* ── Palette e opzioni ────────────────────────────────────────────────────── */

const SKIN_COLORS  = ['#FDDBB4','#F3A06D','#D78B42','#C07540','#8D5524','#5C3317'];
const HAIR_COLORS  = ['#000000','#3B1F0E','#7B3F00','#B5651D','#DAA520','#D2691E','#C0392B','#E8C49A','#F5F5DC','#888888'];
const SHIRT_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316','#1e293b','#FFFFFF'];
const HAT_COLORS   = ['#000000','#3b82f6','#10b981','#ef4444','#8b5cf6','#f97316','#DAA520','#FFFFFF'];
const BG_GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#30cfd0,#330867)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#ffecd2,#fcb69f)',
];

const HAIR_STYLES: Array<{ value: AvatarFullConfig['hairStyle']; label: string; emoji: string }> = [
  { value: 'normal',     label: 'Normale',  emoji: '👦' },
  { value: 'thick',      label: 'Fitto',    emoji: '🧑' },
  { value: 'mohawk',     label: 'Mohawk',   emoji: '🧑‍🎤' },
  { value: 'womanLong',  label: 'Lungo',    emoji: '👩' },
  { value: 'womanShort', label: 'Corto',    emoji: '👩‍💼' },
];

const HAT_STYLES: Array<{ value: AvatarFullConfig['hatStyle']; label: string; emoji: string }> = [
  { value: 'none',    label: 'Nessuno',  emoji: '⬜' },
  { value: 'beanie',  label: 'Berretto', emoji: '🧢' },
  { value: 'turban',  label: 'Turbante', emoji: '🪖' },
];

const EYE_STYLES: Array<{ value: AvatarFullConfig['eyeStyle']; label: string; emoji: string }> = [
  { value: 'circle', label: 'Rotondo', emoji: '👁' },
  { value: 'oval',   label: 'Ovale',   emoji: '😐' },
  { value: 'smile',  label: 'Felice',  emoji: '😊' },
];

const GLASSES_STYLES: Array<{ value: AvatarFullConfig['glassesStyle']; label: string; emoji: string }> = [
  { value: 'none',   label: 'Nessuno',  emoji: '⬜' },
  { value: 'round',  label: 'Tonde',    emoji: '🕶' },
  { value: 'square', label: 'Squadrate',emoji: '👓' },
];

const NOSE_STYLES: Array<{ value: AvatarFullConfig['noseStyle']; label: string; emoji: string }> = [
  { value: 'short', label: 'Piccolo', emoji: '👃' },
  { value: 'long',  label: 'Grande',  emoji: '🦃' },
  { value: 'round', label: 'Rotondo', emoji: '🔵' },
];

const MOUTH_STYLES: Array<{ value: AvatarFullConfig['mouthStyle']; label: string; emoji: string }> = [
  { value: 'laugh', label: 'Sorriso', emoji: '😄' },
  { value: 'smile', label: 'Sorrisetto', emoji: '🙂' },
  { value: 'peace', label: 'Pace',    emoji: '😌' },
];

const SHIRT_STYLES: Array<{ value: AvatarFullConfig['shirtStyle']; label: string; emoji: string }> = [
  { value: 'hoody', label: 'Felpa',   emoji: '🧥' },
  { value: 'short', label: 'T-shirt', emoji: '👕' },
  { value: 'polo',  label: 'Polo',    emoji: '👔' },
];

/* ── Default config ─────────────────────────────────────────────────────── */

const DEFAULT_CONFIG: AvatarFullConfig = {
  sex: 'man',
  faceColor: '#FDDBB4',
  earSize: 'small',
  hairStyle: 'normal',
  hairColor: '#000000',
  hatStyle: 'none',
  hatColor: '#3b82f6',
  eyeStyle: 'oval',
  eyeBrowStyle: 'up',
  glassesStyle: 'none',
  noseStyle: 'short',
  mouthStyle: 'smile',
  shirtStyle: 'hoody',
  shirtColor: '#3b82f6',
  bgColor: BG_GRADIENTS[0],
  isGradient: true,
};

/* ── Sub-components ─────────────────────────────────────────────────────── */

const ColorSwatch: React.FC<{
  color: string; active: boolean; onClick: () => void; gradient?: boolean;
}> = ({ color, active, onClick, gradient }) => (
  <button
    className={`ac-swatch${active ? ' active' : ''}`}
    style={gradient ? { background: color } : { background: color }}
    onClick={onClick}
    title={color}
  />
);

const OptionBtn: React.FC<{
  active: boolean; onClick: () => void; emoji: string; label: string;
}> = ({ active, onClick, emoji, label }) => (
  <button className={`ac-opt-btn${active ? ' active' : ''}`} onClick={onClick}>
    <span className="ac-opt-emoji">{emoji}</span>
    <span className="ac-opt-label">{label}</span>
  </button>
);

/* ── Main component ─────────────────────────────────────────────────────── */

interface AvatarCreatorProps {
  initialConfig?: string | null;   // JSON string from DB
  onSave: (config: AvatarFullConfig) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

const AvatarCreator: React.FC<AvatarCreatorProps> = ({
  initialConfig,
  onSave,
  onRemove,
  onClose,
}) => {
  const [config, setConfig] = useState<AvatarFullConfig>(() => {
    if (initialConfig) {
      try { return { ...DEFAULT_CONFIG, ...JSON.parse(initialConfig) }; }
      catch { /* fall through */ }
    }
    return genConfig(DEFAULT_CONFIG);
  });
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('viso');

  const upd = <K extends keyof AvatarFullConfig>(key: K, val: AvatarFullConfig[K]) =>
    setConfig((prev: AvatarFullConfig) => ({ ...prev, [key]: val }));

  const randomize = () => setConfig(genConfig());

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(config); }
    finally { setSaving(false); }
  };

  const sections = ['viso', 'capelli', 'occhi', 'abiti', 'sfondo'];

  return (
    <div className="ac-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ac-modal">

        {/* Header */}
        <div className="ac-header">
          <span className="ac-title">🎨 Crea il tuo avatar</span>
          <button className="ac-close" onClick={onClose}>×</button>
        </div>

        {/* Preview */}
        <div className="ac-preview-area">
          <ReactNiceAvatar
            style={{ width: 120, height: 120 }}
            shape="circle"
            {...config}
          />
          <button className="ac-random-btn" onClick={randomize} title="Casuale">
            🎲 Casuale
          </button>
        </div>

        {/* Section tabs */}
        <div className="ac-tabs">
          {sections.map(s => (
            <button
              key={s}
              className={`ac-tab${activeSection === s ? ' active' : ''}`}
              onClick={() => setActiveSection(s)}
            >
              {s === 'viso'    ? '😊 Viso'   :
               s === 'capelli' ? '💇 Capelli' :
               s === 'occhi'   ? '👁 Occhi'   :
               s === 'abiti'   ? '👕 Abiti'   :
               '🎨 Sfondo'}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="ac-section-body">

          {/* ── VISO ── */}
          {activeSection === 'viso' && (
            <div className="ac-section">
              <div className="ac-row">
                <span className="ac-row-label">Genere</span>
                <div className="ac-opts">
                  <OptionBtn active={config.sex === 'man'}   onClick={() => upd('sex', 'man')}   emoji="👨" label="Uomo" />
                  <OptionBtn active={config.sex === 'woman'} onClick={() => upd('sex', 'woman')} emoji="👩" label="Donna" />
                </div>
              </div>
              <div className="ac-row">
                <span className="ac-row-label">Carnagione</span>
                <div className="ac-swatches">
                  {SKIN_COLORS.map(c => (
                    <ColorSwatch key={c} color={c} active={config.faceColor === c} onClick={() => upd('faceColor', c)} />
                  ))}
                </div>
              </div>
              <div className="ac-row">
                <span className="ac-row-label">Orecchie</span>
                <div className="ac-opts">
                  <OptionBtn active={config.earSize === 'small'} onClick={() => upd('earSize', 'small')} emoji="👂" label="Piccole" />
                  <OptionBtn active={config.earSize === 'big'}   onClick={() => upd('earSize', 'big')}   emoji="🐘" label="Grandi" />
                </div>
              </div>
              <div className="ac-row">
                <span className="ac-row-label">Naso</span>
                <div className="ac-opts">
                  {NOSE_STYLES.map(n => (
                    <OptionBtn key={n.value} active={config.noseStyle === n.value} onClick={() => upd('noseStyle', n.value)} emoji={n.emoji} label={n.label} />
                  ))}
                </div>
              </div>
              <div className="ac-row">
                <span className="ac-row-label">Bocca</span>
                <div className="ac-opts">
                  {MOUTH_STYLES.map(m => (
                    <OptionBtn key={m.value} active={config.mouthStyle === m.value} onClick={() => upd('mouthStyle', m.value)} emoji={m.emoji} label={m.label} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CAPELLI ── */}
          {activeSection === 'capelli' && (
            <div className="ac-section">
              <div className="ac-row">
                <span className="ac-row-label">Stile capelli</span>
                <div className="ac-opts">
                  {HAIR_STYLES.map(h => (
                    <OptionBtn key={h.value} active={config.hairStyle === h.value} onClick={() => upd('hairStyle', h.value)} emoji={h.emoji} label={h.label} />
                  ))}
                </div>
              </div>
              <div className="ac-row">
                <span className="ac-row-label">Colore capelli</span>
                <div className="ac-swatches">
                  {HAIR_COLORS.map(c => (
                    <ColorSwatch key={c} color={c} active={config.hairColor === c} onClick={() => upd('hairColor', c)} />
                  ))}
                </div>
              </div>
              <div className="ac-row">
                <span className="ac-row-label">Cappello</span>
                <div className="ac-opts">
                  {HAT_STYLES.map(h => (
                    <OptionBtn key={h.value} active={config.hatStyle === h.value} onClick={() => upd('hatStyle', h.value)} emoji={h.emoji} label={h.label} />
                  ))}
                </div>
              </div>
              {config.hatStyle !== 'none' && (
                <div className="ac-row">
                  <span className="ac-row-label">Colore cappello</span>
                  <div className="ac-swatches">
                    {HAT_COLORS.map(c => (
                      <ColorSwatch key={c} color={c} active={config.hatColor === c} onClick={() => upd('hatColor', c)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── OCCHI ── */}
          {activeSection === 'occhi' && (
            <div className="ac-section">
              <div className="ac-row">
                <span className="ac-row-label">Forma occhi</span>
                <div className="ac-opts">
                  {EYE_STYLES.map(e => (
                    <OptionBtn key={e.value} active={config.eyeStyle === e.value} onClick={() => upd('eyeStyle', e.value)} emoji={e.emoji} label={e.label} />
                  ))}
                </div>
              </div>
              <div className="ac-row">
                <span className="ac-row-label">Sopracciglia</span>
                <div className="ac-opts">
                  <OptionBtn active={config.eyeBrowStyle === 'up'}      onClick={() => upd('eyeBrowStyle', 'up')}      emoji="⬆" label="Alzate" />
                  <OptionBtn active={config.eyeBrowStyle === 'upWoman'} onClick={() => upd('eyeBrowStyle', 'upWoman')} emoji="🌙" label="Arcuate" />
                </div>
              </div>
              <div className="ac-row">
                <span className="ac-row-label">Occhiali</span>
                <div className="ac-opts">
                  {GLASSES_STYLES.map(g => (
                    <OptionBtn key={g.value} active={config.glassesStyle === g.value} onClick={() => upd('glassesStyle', g.value)} emoji={g.emoji} label={g.label} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ABITI ── */}
          {activeSection === 'abiti' && (
            <div className="ac-section">
              <div className="ac-row">
                <span className="ac-row-label">Tipo abito</span>
                <div className="ac-opts">
                  {SHIRT_STYLES.map(s => (
                    <OptionBtn key={s.value} active={config.shirtStyle === s.value} onClick={() => upd('shirtStyle', s.value)} emoji={s.emoji} label={s.label} />
                  ))}
                </div>
              </div>
              <div className="ac-row">
                <span className="ac-row-label">Colore abito</span>
                <div className="ac-swatches">
                  {SHIRT_COLORS.map(c => (
                    <ColorSwatch key={c} color={c} active={config.shirtColor === c} onClick={() => upd('shirtColor', c)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SFONDO ── */}
          {activeSection === 'sfondo' && (
            <div className="ac-section">
              <div className="ac-row">
                <span className="ac-row-label">Gradiente</span>
                <div className="ac-swatches ac-swatches--lg">
                  {BG_GRADIENTS.map(g => (
                    <ColorSwatch key={g} color={g} active={config.bgColor === g} onClick={() => upd('bgColor', g)} gradient />
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="ac-footer">
          <button className="ac-remove-btn" onClick={onRemove}>
            🗑 Rimuovi avatar
          </button>
          <div className="ac-footer-right">
            <button className="ac-cancel-btn" onClick={onClose}>Annulla</button>
            <button className="ac-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvataggio...' : '✓ Salva avatar'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AvatarCreator;
