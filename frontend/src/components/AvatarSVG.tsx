import React from 'react';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface AvatarConfig {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  outfit: string;
  accessory: string;
  expression: string;
  mood: string;
  badge: string;
  lipstick: string;
  blush: string;
  eyelashes: string;
  earring: string;
  nailColor: string;
  /** Background color stored inside the config for self-contained rendering */
  avatarColor?: string;
}

/* ── Options ────────────────────────────────────────────────────────────── */

export const SKIN_TONES = [
  { id: 'light',  label: 'Chiara',      color: '#FFDBB4' },
  { id: 'medium', label: 'Dorata',      color: '#D4956A' },
  { id: 'tan',    label: 'Abbronzata',  color: '#C68642' },
  { id: 'dark',   label: 'Scura',       color: '#8D5524' },
  { id: 'deep',   label: 'Profonda',    color: '#4A2912' },
];

export const HAIR_STYLES = [
  { id: 'short',     label: 'Corto',        emoji: '💇' },
  { id: 'medium',    label: 'Medio',        emoji: '👩' },
  { id: 'long',      label: 'Lungo liscio', emoji: '👱‍♀️' },
  { id: 'waves',     label: 'Ondulato',     emoji: '〰️' },
  { id: 'curly',     label: 'Ricci',        emoji: '🌀' },
  { id: 'braids',    label: 'Trecce',       emoji: '🪢' },
  { id: 'twintails', label: 'Codini',       emoji: '👯‍♀️' },
  { id: 'bun',       label: 'Chignon',      emoji: '👸' },
  { id: 'ponytail',  label: 'Coda alta',    emoji: '🐴' },
  { id: 'pixie',     label: 'Pixie cut',    emoji: '✂️' },
  { id: 'bangs',     label: 'Frangetta',    emoji: '💁‍♀️' },
  { id: 'bald',      label: 'Rasato',       emoji: '🧑‍🦲' },
];

export const HAIR_COLORS = [
  { id: '#1a1a1a', label: 'Nero' },
  { id: '#4a3728', label: 'Castano' },
  { id: '#8B6914', label: 'Bruno' },
  { id: '#C8A951', label: 'Biondo' },
  { id: '#E8C97A', label: 'Biondo miele' },
  { id: '#D2691E', label: 'Rame' },
  { id: '#FF8C69', label: 'Rosso rame' },
  { id: '#E5E5E5', label: 'Grigio' },
  { id: '#FFFFFF', label: 'Bianco' },
  { id: '#FF4444', label: 'Rosso' },
  { id: '#FF69B4', label: 'Rosa' },
  { id: '#FFB6C1', label: 'Rosa chiaro' },
  { id: '#9B59B6', label: 'Viola' },
  { id: '#DDA0DD', label: 'Lilla' },
  { id: '#3498DB', label: 'Blu' },
  { id: '#2ECC71', label: 'Verde' },
];

export const EYE_COLORS = [
  { id: 'brown',  label: 'Marrone',  color: '#8B6914' },
  { id: 'blue',   label: 'Blu',      color: '#4A90D9' },
  { id: 'green',  label: 'Verde',    color: '#2D8653' },
  { id: 'hazel',  label: 'Nocciola', color: '#A0784C' },
  { id: 'gray',   label: 'Grigio',   color: '#8B9DC3' },
  { id: 'black',  label: 'Nero',     color: '#1a1a1a' },
  { id: 'violet', label: 'Viola',    color: '#9B59B6' },
  { id: 'teal',   label: 'Teal',     color: '#008B8B' },
];

export const OUTFITS = [
  { id: 'casual',    label: 'Casual',      emoji: '👕' },
  { id: 'dress',     label: 'Vestito',     emoji: '👗' },
  { id: 'floral',    label: 'Floreale',    emoji: '🌺' },
  { id: 'elegant',   label: 'Elegante',    emoji: '✨' },
  { id: 'princess',  label: 'Principessa', emoji: '👸' },
  { id: 'sport',     label: 'Sport',       emoji: '🏃‍♀️' },
  { id: 'formal',    label: 'Formale',     emoji: '👔' },
  { id: 'creative',  label: 'Creativo',    emoji: '🎨' },
  { id: 'tech',      label: 'Tech',        emoji: '💻' },
  { id: 'ninja',     label: 'Ninja',       emoji: '🥷' },
  { id: 'astronaut', label: 'Astronauta',  emoji: '👩‍🚀' },
  { id: 'chef',      label: 'Chef',        emoji: '👩‍🍳' },
];

export const ACCESSORIES = [
  { id: 'none',       label: 'Nessuno',       emoji: '✖️' },
  { id: 'glasses',    label: 'Occhiali',      emoji: '👓' },
  { id: 'sunglasses', label: 'Occhiali sole', emoji: '🕶️' },
  { id: 'headband',   label: 'Cerchietto',    emoji: '🎀' },
  { id: 'tiara',      label: 'Diadema',       emoji: '💫' },
  { id: 'flower',     label: 'Fiore',         emoji: '🌸' },
  { id: 'bow',        label: 'Fiocco',        emoji: '🎗️' },
  { id: 'crown',      label: 'Corona',        emoji: '👑' },
  { id: 'hat',        label: 'Cappello',      emoji: '🎩' },
  { id: 'cap',        label: 'Berretto',      emoji: '🧢' },
  { id: 'headphones', label: 'Cuffie',        emoji: '🎧' },
  { id: 'veil',       label: 'Velo sposa',    emoji: '🤍' },
];

export const EXPRESSIONS = [
  { id: 'happy',   label: 'Felice',            emoji: '😄' },
  { id: 'cute',    label: 'Carina',            emoji: '🥰' },
  { id: 'wink',    label: 'Ammiccante',        emoji: '😉' },
  { id: 'kiss',    label: 'Bacio',             emoji: '😘' },
  { id: 'excited', label: 'Entusiasta',        emoji: '🤩' },
  { id: 'cool',    label: 'Cool',              emoji: '😎' },
  { id: 'smirk',   label: 'Sorriso malizioso', emoji: '😏' },
  { id: 'neutral', label: 'Neutro',            emoji: '😐' },
  { id: 'focused', label: 'Concentrata',       emoji: '🧐' },
  { id: 'silly',   label: 'Buffa',             emoji: '🤪' },
  { id: 'tired',   label: 'Stanca',            emoji: '😴' },
  { id: 'serious', label: 'Seria',             emoji: '😤' },
];

export const MOODS = [
  { id: 'romantic',  label: 'Romantica',    emoji: '💕', color: '#FF69B4' },
  { id: 'playful',   label: 'Giocosa',      emoji: '🎀', color: '#FF85A1' },
  { id: 'energized', label: 'Energica',     emoji: '⚡', color: '#F39C12' },
  { id: 'calm',      label: 'Calma',        emoji: '🌊', color: '#3498DB' },
  { id: 'creative',  label: 'Creativa',     emoji: '🌈', color: '#9B59B6' },
  { id: 'confident', label: 'Sicura di sé', emoji: '💪', color: '#E74C3C' },
  { id: 'social',    label: 'Sociale',      emoji: '🎉', color: '#2ECC71' },
  { id: 'dreamy',    label: 'Sognante',     emoji: '🌙', color: '#7C83FD' },
  { id: 'zen',       label: 'Zen',          emoji: '🧘', color: '#1ABC9C' },
  { id: 'focused',   label: 'Focus',        emoji: '🎯', color: '#8B5CF6' },
];

export const BADGES = [
  { id: 'none',      label: 'Nessuno',     emoji: '' },
  { id: 'heart',     label: 'Cuore',       emoji: '💖' },
  { id: 'butterfly', label: 'Farfalla',    emoji: '🦋' },
  { id: 'sparkles',  label: 'Brillantini', emoji: '✨' },
  { id: 'unicorn',   label: 'Unicorno',    emoji: '🦄' },
  { id: 'flower',    label: 'Fiore',       emoji: '🌸' },
  { id: 'rainbow',   label: 'Arcobaleno',  emoji: '🌈' },
  { id: 'star',      label: 'Stella',      emoji: '⭐' },
  { id: 'diamond',   label: 'Diamante',    emoji: '💎' },
  { id: 'trophy',    label: 'Trofeo',      emoji: '🏆' },
  { id: 'fire',      label: 'Fuoco',       emoji: '🔥' },
  { id: 'rocket',    label: 'Razzo',       emoji: '🚀' },
];

export const LIPSTICKS = [
  { id: 'none',  label: 'Nessuno', color: '' },
  { id: 'pink',  label: 'Rosa',    color: '#FF69B4' },
  { id: 'red',   label: 'Rosso',   color: '#DC143C' },
  { id: 'coral', label: 'Corallo', color: '#FF7F50' },
  { id: 'mauve', label: 'Malva',   color: '#C9859E' },
  { id: 'nude',  label: 'Nude',    color: '#D2967A' },
  { id: 'berry', label: 'Berry',   color: '#8B0057' },
  { id: 'plum',  label: 'Prugna',  color: '#7B2D8B' },
];

export const BLUSHES = [
  { id: 'none',   label: 'Nessuno',  color: '' },
  { id: 'soft',   label: 'Delicato', color: 'rgba(255,182,193,0.45)' },
  { id: 'rosy',   label: 'Rosato',   color: 'rgba(219,112,147,0.4)' },
  { id: 'peach',  label: 'Pesca',    color: 'rgba(255,160,122,0.4)' },
  { id: 'bronze', label: 'Bronzo',   color: 'rgba(180,100,50,0.3)' },
];

export const EYELASHES_OPTS = [
  { id: 'none',     label: 'Nessuna',    emoji: '👁️' },
  { id: 'natural',  label: 'Naturale',   emoji: '✨' },
  { id: 'dramatic', label: 'Voluminoso', emoji: '💃' },
  { id: 'wispy',    label: 'Leggero',    emoji: '🪶' },
];

export const EARRINGS = [
  { id: 'none',     label: 'Nessuno',   emoji: '✖️' },
  { id: 'studs',    label: 'Lobo',      emoji: '🟡' },
  { id: 'hoops',    label: 'Cerchi',    emoji: '⭕' },
  { id: 'drops',    label: 'Gocce',     emoji: '💧' },
  { id: 'pearls',   label: 'Perle',     emoji: '🫧' },
  { id: 'stars',    label: 'Stelle',    emoji: '⭐' },
  { id: 'hearts',   label: 'Cuoricini', emoji: '💕' },
  { id: 'crystals', label: 'Cristalli', emoji: '💎' },
];

export const NAIL_COLORS = [
  { id: 'none',        label: 'Naturale',   color: '#F5DEB3' },
  { id: 'pink',        label: 'Rosa',       color: '#FF69B4' },
  { id: 'red',         label: 'Rosso',      color: '#DC143C' },
  { id: 'purple',      label: 'Viola',      color: '#9B59B6' },
  { id: 'nude',        label: 'Nude',       color: '#D2B48C' },
  { id: 'black',       label: 'Nero',       color: '#1a1a1a' },
  { id: 'french',      label: 'French',     color: '#FFF5EE' },
  { id: 'glitter',     label: 'Glitter',    color: '#FFD700' },
  { id: 'holographic', label: 'Olografico', color: '#B0E0E6' },
  { id: 'coral',       label: 'Corallo',    color: '#FF7F50' },
];

export const AVATAR_COLORS = [
  '#DB2777', '#EC4899', '#F472B6', '#9333EA',
  '#7C3AED', '#4F46E5', '#0284C7', '#059669',
  '#D97706', '#DC2626', '#374151', '#166534',
];

export const DEFAULT_CONFIG: AvatarConfig = {
  skinTone: 'light',
  hairStyle: 'long',
  hairColor: '#4a3728',
  eyeColor: 'brown',
  outfit: 'dress',
  accessory: 'none',
  expression: 'happy',
  mood: 'romantic',
  badge: 'heart',
  lipstick: 'pink',
  blush: 'soft',
  eyelashes: 'natural',
  earring: 'studs',
  nailColor: 'pink',
};

/* ── AvatarPreview SVG component ─────────────────────────────────────────── */

export function AvatarPreview({
  config,
  color,
  size = 120,
  responsive = false,
}: {
  config: AvatarConfig;
  color: string;
  size?: number;
  /** When true the SVG fills its container (100%×100%) */
  responsive?: boolean;
}) {
  const skin = SKIN_TONES.find(s => s.id === config.skinTone)?.color ?? '#FFDBB4';
  const eye  = EYE_COLORS.find(e => e.id === config.eyeColor)?.color ?? '#8B6914';
  const hair = config.hairColor;
  const badge = BADGES.find(b => b.id === config.badge)?.emoji ?? '';
  const acc   = ACCESSORIES.find(a => a.id === config.accessory)?.emoji ?? '';
  const moodColor = MOODS.find(m => m.id === config.mood)?.color ?? '#FF69B4';
  const lipColor  = config.lipstick !== 'none'
    ? (LIPSTICKS.find(l => l.id === config.lipstick)?.color ?? '')
    : '';
  const blushColor = BLUSHES.find(b => b.id === config.blush)?.color ?? '';

  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  const hairPaths: Record<string, React.ReactNode> = {
    bald: null,
    short: <ellipse cx={cx} cy={cy - s * 0.18} rx={s * 0.22} ry={s * 0.12} fill={hair} />,
    pixie: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.17} rx={s * 0.22} ry={s * 0.14} fill={hair} />
        <ellipse cx={cx - s * 0.18} cy={cy - s * 0.08} rx={s * 0.06} ry={s * 0.09} fill={hair} />
        <ellipse cx={cx + s * 0.18} cy={cy - s * 0.08} rx={s * 0.06} ry={s * 0.09} fill={hair} />
      </>
    ),
    medium: <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.18} fill={hair} />,
    long: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.18} fill={hair} />
        <rect x={cx - s * 0.22} y={cy - s * 0.02} width={s * 0.1} height={s * 0.32} rx={4} fill={hair} />
        <rect x={cx + s * 0.12} y={cy - s * 0.02} width={s * 0.1} height={s * 0.32} rx={4} fill={hair} />
      </>
    ),
    waves: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.18} fill={hair} />
        <rect x={cx - s * 0.22} y={cy - s * 0.02} width={s * 0.1} height={s * 0.26} rx={4} fill={hair} />
        <rect x={cx + s * 0.12} y={cy - s * 0.02} width={s * 0.1} height={s * 0.26} rx={4} fill={hair} />
        <path d={`M ${cx - s*0.22} ${cy + s*0.12} Q ${cx - s*0.16} ${cy + s*0.17} ${cx - s*0.10} ${cy + s*0.12}`} stroke={hair} strokeWidth={s * 0.06} fill="none" strokeLinecap="round" />
        <path d={`M ${cx + s*0.12} ${cy + s*0.12} Q ${cx + s*0.18} ${cy + s*0.17} ${cx + s*0.24} ${cy + s*0.12}`} stroke={hair} strokeWidth={s * 0.06} fill="none" strokeLinecap="round" />
      </>
    ),
    bangs: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.18} fill={hair} />
        <rect x={cx - s * 0.22} y={cy - s * 0.02} width={s * 0.1} height={s * 0.32} rx={4} fill={hair} />
        <rect x={cx + s * 0.12} y={cy - s * 0.02} width={s * 0.1} height={s * 0.32} rx={4} fill={hair} />
        <rect x={cx - s * 0.22} y={cy - s * 0.24} width={s * 0.44} height={s * 0.1} rx={2} fill={hair} />
      </>
    ),
    bun: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.16} fill={hair} />
        <circle cx={cx} cy={cy - s * 0.35} r={s * 0.09} fill={hair} />
        <circle cx={cx} cy={cy - s * 0.35} r={s * 0.05} fill={hair} opacity={0.6} />
      </>
    ),
    ponytail: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.16} fill={hair} />
        <rect x={cx + s * 0.14} y={cy - s * 0.18} width={s * 0.07} height={s * 0.32} rx={3} fill={hair} />
      </>
    ),
    curly: (
      <>
        {[-0.18, -0.08, 0.02, 0.12].map((dx, i) => (
          <circle key={i} cx={cx + dx * s} cy={cy - s * 0.2} r={s * 0.09} fill={hair} />
        ))}
        <ellipse cx={cx - s*0.18} cy={cy - s*0.07} rx={s*0.07} ry={s*0.1} fill={hair} />
        <ellipse cx={cx + s*0.18} cy={cy - s*0.07} rx={s*0.07} ry={s*0.1} fill={hair} />
      </>
    ),
    twintails: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.16} fill={hair} />
        <rect x={cx - s * 0.28} y={cy - s * 0.2} width={s * 0.07} height={s * 0.34} rx={3} fill={hair} />
        <ellipse cx={cx - s * 0.245} cy={cy + s * 0.14} rx={s * 0.05} ry={s * 0.03} fill={hair} />
        <rect x={cx + s * 0.21} y={cy - s * 0.2} width={s * 0.07} height={s * 0.34} rx={3} fill={hair} />
        <ellipse cx={cx + s * 0.245} cy={cy + s * 0.14} rx={s * 0.05} ry={s * 0.03} fill={hair} />
      </>
    ),
    braids: (
      <>
        <ellipse cx={cx} cy={cy - s * 0.14} rx={s * 0.24} ry={s * 0.16} fill={hair} />
        <rect x={cx - s * 0.24} y={cy - s * 0.02} width={s * 0.1} height={s * 0.32} rx={3} fill={hair} />
        <rect x={cx + s * 0.14} y={cy - s * 0.02} width={s * 0.1} height={s * 0.32} rx={3} fill={hair} />
        {[0.02, 0.10, 0.18, 0.26].map((dy, i) => (
          <React.Fragment key={i}>
            <line x1={cx - s*0.24} y1={cy + dy*s} x2={cx - s*0.14} y2={cy + (dy + 0.05)*s} stroke={hair} strokeWidth={2.5} opacity={0.5} />
            <line x1={cx + s*0.24} y1={cy + dy*s} x2={cx + s*0.14} y2={cy + (dy + 0.05)*s} stroke={hair} strokeWidth={2.5} opacity={0.5} />
          </React.Fragment>
        ))}
      </>
    ),
  };

  const earY = cy - s * 0.03;
  const earXL = cx - s * 0.23;
  const earXR = cx + s * 0.23;
  const gold = '#FFD700';
  const earringEl = (() => {
    if (config.earring === 'none') return null;
    if (config.earring === 'studs') return (
      <>
        <circle cx={earXL} cy={earY} r={s * 0.025} fill={gold} />
        <circle cx={earXR} cy={earY} r={s * 0.025} fill={gold} />
      </>
    );
    if (config.earring === 'hoops') return (
      <>
        <circle cx={earXL} cy={earY + s * 0.04} r={s * 0.04} fill="none" stroke={gold} strokeWidth={1.5} />
        <circle cx={earXR} cy={earY + s * 0.04} r={s * 0.04} fill="none" stroke={gold} strokeWidth={1.5} />
      </>
    );
    if (config.earring === 'drops') return (
      <>
        <ellipse cx={earXL} cy={earY + s * 0.05} rx={s * 0.015} ry={s * 0.05} fill={gold} />
        <ellipse cx={earXR} cy={earY + s * 0.05} rx={s * 0.015} ry={s * 0.05} fill={gold} />
      </>
    );
    if (config.earring === 'pearls') return (
      <>
        <circle cx={earXL} cy={earY} r={s * 0.028} fill="#F0EAD6" stroke="#DDD" strokeWidth={0.5} />
        <circle cx={earXR} cy={earY} r={s * 0.028} fill="#F0EAD6" stroke="#DDD" strokeWidth={0.5} />
      </>
    );
    if (config.earring === 'stars') return (
      <>
        <text x={earXL - s*0.025} y={earY + s*0.02} fontSize={s * 0.07} fill={gold}>★</text>
        <text x={earXR - s*0.025} y={earY + s*0.02} fontSize={s * 0.07} fill={gold}>★</text>
      </>
    );
    if (config.earring === 'hearts') return (
      <>
        <text x={earXL - s*0.025} y={earY + s*0.02} fontSize={s * 0.07} fill="#FF69B4">♥</text>
        <text x={earXR - s*0.025} y={earY + s*0.02} fontSize={s * 0.07} fill="#FF69B4">♥</text>
      </>
    );
    if (config.earring === 'crystals') return (
      <>
        <polygon points={`${earXL},${earY - s*0.02} ${earXL - s*0.02},${earY + s*0.04} ${earXL + s*0.02},${earY + s*0.04}`} fill="#B0E0E6" opacity={0.85} />
        <polygon points={`${earXR},${earY - s*0.02} ${earXR - s*0.02},${earY + s*0.04} ${earXR + s*0.02},${earY + s*0.04}`} fill="#B0E0E6" opacity={0.85} />
      </>
    );
    return null;
  })();

  const eyeLY = cy - s * 0.06;
  const eyelashEl = (() => {
    if (config.eyelashes === 'none') return null;
    const count = config.eyelashes === 'dramatic' ? 5 : config.eyelashes === 'wispy' ? 3 : 4;
    const len   = config.eyelashes === 'dramatic' ? s * 0.045 : s * 0.03;
    const lashes: React.ReactNode[] = [];
    const eyeCenters = [cx - s * 0.07, cx + s * 0.07];
    eyeCenters.forEach((ex, ei) => {
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = (-160 + t * 100) * Math.PI / 180;
        const r = s * 0.035;
        const bx = ex + Math.cos(angle) * r;
        const by = eyeLY + Math.sin(angle) * r;
        const tx = ex + Math.cos(angle) * (r + len);
        const ty = eyeLY + Math.sin(angle) * (r + len);
        lashes.push(
          <line key={`${ei}-${i}`} x1={bx} y1={by} x2={tx} y2={ty}
            stroke="#1a1a1a" strokeWidth={1} strokeLinecap="round" />
        );
      }
    });
    return <>{lashes}</>;
  })();

  const mouthColor = lipColor || '#8B6914';

  const outfitColor: Record<string, string> = {
    formal:    '#2C3E50',
    sport:     '#E74C3C',
    creative:  '#9B59B6',
    tech:      '#2980B9',
    ninja:     '#1a1a1a',
    astronaut: '#BDC3C7',
    chef:      '#FFFFFF',
    dress:     '#E91E8C',
    floral:    '#FF7F9E',
    elegant:   '#8B008B',
    princess:  '#FFB6C1',
  };
  const bodyColor = outfitColor[config.outfit] ?? '#3498DB';

  const containerStyle = responsive
    ? { width: '100%', height: '100%' }
    : { width: s, height: s };

  return (
    <div className="avatar-preview" style={containerStyle}>
      <svg
        width={responsive ? '100%' : s}
        height={responsive ? '100%' : s}
        viewBox={`0 0 ${s} ${s}`}
        style={{ display: 'block' }}
      >
        {/* Background */}
        <circle cx={cx} cy={cy} r={s * 0.48} fill={color} />
        {/* Mood ring */}
        <circle cx={cx} cy={cy} r={s * 0.48} fill="none" stroke={moodColor} strokeWidth={3} opacity={0.7} />
        {/* Outfit body */}
        <ellipse cx={cx} cy={cy + s * 0.38} rx={s * 0.28} ry={s * 0.14} fill={bodyColor} />
        {/* Neck */}
        <rect x={cx - s * 0.08} y={cy + s * 0.12} width={s * 0.16} height={s * 0.14} fill={skin} />
        {/* Face */}
        <circle cx={cx} cy={cy - s * 0.04} r={s * 0.22} fill={skin} />
        {/* Blush */}
        {blushColor && (
          <>
            <ellipse cx={cx - s * 0.14} cy={cy + s * 0.01} rx={s * 0.07} ry={s * 0.04} fill={blushColor} />
            <ellipse cx={cx + s * 0.14} cy={cy + s * 0.01} rx={s * 0.07} ry={s * 0.04} fill={blushColor} />
          </>
        )}
        {/* Hair */}
        {hairPaths[config.hairStyle] ?? hairPaths.medium}
        {/* Earrings */}
        {earringEl}
        {/* Eyes */}
        {config.expression === 'wink' ? (
          <>
            <circle cx={cx - s * 0.07} cy={eyeLY} r={s * 0.035} fill={eye} />
            <circle cx={cx - s * 0.065} cy={eyeLY - s * 0.01} r={s * 0.012} fill="white" />
            <path d={`M ${cx + s*0.04} ${eyeLY} Q ${cx + s*0.07} ${eyeLY + s*0.02} ${cx + s*0.10} ${eyeLY}`}
              stroke={eye} strokeWidth={2} fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx={cx - s * 0.07} cy={eyeLY} r={s * 0.035} fill={eye} />
            <circle cx={cx + s * 0.07} cy={eyeLY} r={s * 0.035} fill={eye} />
            <circle cx={cx - s * 0.065} cy={eyeLY - s * 0.01} r={s * 0.012} fill="white" />
            <circle cx={cx + s * 0.075} cy={eyeLY - s * 0.01} r={s * 0.012} fill="white" />
          </>
        )}
        {/* Eyelashes */}
        {eyelashEl}
        {/* Mouth */}
        {config.expression === 'kiss' ? (
          <ellipse cx={cx} cy={cy + s * 0.06} rx={s * 0.035} ry={s * 0.025} fill={mouthColor || '#D2967A'} />
        ) : config.expression === 'cute' ? (
          <path d={`M ${cx - s * 0.08} ${cy + s * 0.04} Q ${cx} ${cy + s * 0.13} ${cx + s * 0.08} ${cy + s * 0.04}`}
            stroke={mouthColor} strokeWidth={2} fill={lipColor ? lipColor : 'none'}
            strokeLinecap="round" opacity={lipColor ? 0.85 : 1} />
        ) : config.expression === 'smirk' ? (
          <path d={`M ${cx - s * 0.04} ${cy + s * 0.07} Q ${cx + s * 0.03} ${cy + s * 0.1} ${cx + s * 0.08} ${cy + s * 0.05}`}
            stroke={mouthColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        ) : config.expression === 'happy' || config.expression === 'excited' || config.expression === 'cool' || config.expression === 'wink' ? (
          <path d={`M ${cx - s * 0.07} ${cy + s * 0.04} Q ${cx} ${cy + s * 0.11} ${cx + s * 0.07} ${cy + s * 0.04}`}
            stroke={mouthColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        ) : config.expression === 'neutral' || config.expression === 'focused' || config.expression === 'serious' ? (
          <line x1={cx - s * 0.06} y1={cy + s * 0.06} x2={cx + s * 0.06} y2={cy + s * 0.06}
            stroke={mouthColor} strokeWidth={1.5} strokeLinecap="round" />
        ) : (
          <path d={`M ${cx - s * 0.07} ${cy + s * 0.08} Q ${cx} ${cy + s * 0.03} ${cx + s * 0.07} ${cy + s * 0.08}`}
            stroke={mouthColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        )}
        {/* Lipstick gloss highlight */}
        {lipColor && config.expression !== 'kiss' && (
          <ellipse cx={cx - s*0.02} cy={cy + s * 0.06} rx={s*0.02} ry={s*0.007} fill="white" opacity={0.35} />
        )}
      </svg>
      {/* Emoji overlays */}
      {acc && acc !== '✖️' && (
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
