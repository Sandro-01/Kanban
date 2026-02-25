import React from 'react';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface AvatarConfig {
  gender: 'female' | 'male';
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
  beard: string;
  /** Background color stored inside the config for self-contained rendering */
  avatarColor?: string;
}

/* ── Options ────────────────────────────────────────────────────────────── */

export const GENDERS = [
  { id: 'female', label: 'Donna', emoji: '👩' },
  { id: 'male',   label: 'Uomo',  emoji: '👨' },
];

export const SKIN_TONES = [
  { id: 'light',  label: 'Chiara',      color: '#FFDBB4' },
  { id: 'medium', label: 'Dorata',      color: '#D4956A' },
  { id: 'tan',    label: 'Abbronzata',  color: '#C68642' },
  { id: 'dark',   label: 'Scura',       color: '#8D5524' },
  { id: 'deep',   label: 'Profonda',    color: '#4A2912' },
];

export const FEMALE_HAIR_STYLES = [
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

export const MALE_HAIR_STYLES = [
  { id: 'sidepart',  label: 'Scalata',      emoji: '💈' },
  { id: 'buzz',      label: 'Buzzcut',      emoji: '✂️' },
  { id: 'pompadour', label: 'Pompadour',    emoji: '🕺' },
  { id: 'undercut',  label: 'Undercut',     emoji: '💇‍♂️' },
  { id: 'curly',     label: 'Ricci',        emoji: '🌀' },
  { id: 'medium',    label: 'Medio',        emoji: '👨' },
  { id: 'short',     label: 'Corto',        emoji: '👦' },
  { id: 'bald',      label: 'Calvo',        emoji: '🧑‍🦲' },
  { id: 'ponytail',  label: 'Coda',         emoji: '🐴' },
];

/** Union of all styles for TypeScript — the component picks from the right set */
export const HAIR_STYLES = FEMALE_HAIR_STYLES;

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
  { id: 'sport',     label: 'Sport',       emoji: '🏃' },
  { id: 'formal',    label: 'Formale',     emoji: '👔' },
  { id: 'creative',  label: 'Creativo',    emoji: '🎨' },
  { id: 'tech',      label: 'Tech',        emoji: '💻' },
  { id: 'ninja',     label: 'Ninja',       emoji: '🥷' },
  { id: 'astronaut', label: 'Astronauta',  emoji: '🧑‍🚀' },
  { id: 'chef',      label: 'Chef',        emoji: '🧑‍🍳' },
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
  { id: 'cute',    label: 'Carino/a',          emoji: '🥰' },
  { id: 'wink',    label: 'Ammiccante',        emoji: '😉' },
  { id: 'kiss',    label: 'Bacio',             emoji: '😘' },
  { id: 'excited', label: 'Entusiasta',        emoji: '🤩' },
  { id: 'cool',    label: 'Cool',              emoji: '😎' },
  { id: 'smirk',   label: 'Sorriso obliquo',  emoji: '😏' },
  { id: 'neutral', label: 'Neutro',            emoji: '😐' },
  { id: 'focused', label: 'Concentrato/a',     emoji: '🧐' },
  { id: 'silly',   label: 'Buffo/a',           emoji: '🤪' },
  { id: 'tired',   label: 'Stanco/a',          emoji: '😴' },
  { id: 'serious', label: 'Serio/a',           emoji: '😤' },
];

export const MOODS = [
  { id: 'romantic',  label: 'Romantico/a',  emoji: '💕', color: '#FF69B4' },
  { id: 'playful',   label: 'Giocoso/a',    emoji: '🎀', color: '#FF85A1' },
  { id: 'energized', label: 'Energico/a',   emoji: '⚡', color: '#F39C12' },
  { id: 'calm',      label: 'Calmo/a',      emoji: '🌊', color: '#3498DB' },
  { id: 'creative',  label: 'Creativo/a',   emoji: '🌈', color: '#9B59B6' },
  { id: 'confident', label: 'Sicuro/a',     emoji: '💪', color: '#E74C3C' },
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

export const BEARD_STYLES = [
  { id: 'none',    label: 'Nessuna',     emoji: '✖️' },
  { id: 'stubble', label: 'Barba corta', emoji: '🧔' },
  { id: 'goatee',  label: 'Pizzetto',    emoji: '🧔‍♂️' },
  { id: 'short',   label: 'Barba media', emoji: '🧔' },
  { id: 'full',    label: 'Barba piena', emoji: '🧔‍♂️' },
];

export const AVATAR_COLORS = [
  '#DB2777', '#EC4899', '#F472B6', '#9333EA',
  '#7C3AED', '#4F46E5', '#0284C7', '#059669',
  '#D97706', '#DC2626', '#374151', '#166534',
];

export const DEFAULT_CONFIG: AvatarConfig = {
  gender: 'female',
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
  beard: 'none',
};

export const MALE_DEFAULT_CONFIG: AvatarConfig = {
  gender: 'male',
  skinTone: 'medium',
  hairStyle: 'sidepart',
  hairColor: '#4a3728',
  eyeColor: 'brown',
  outfit: 'formal',
  accessory: 'none',
  expression: 'happy',
  mood: 'confident',
  badge: 'none',
  lipstick: 'none',
  blush: 'none',
  eyelashes: 'none',
  earring: 'none',
  nailColor: 'none',
  beard: 'none',
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
  const isMale = config.gender === 'male';

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

  /* ── Face geometry ─── */
  // Female: rounder face. Male: slightly wider with chin definition.
  const faceRx = isMale ? s * 0.225 : s * 0.215;
  const faceRy = isMale ? s * 0.228 : s * 0.22;
  const faceCy = cy - s * 0.03;

  /* ── Hair paths ─── */
  // Female hair styles
  const femaleHairPaths: Record<string, React.ReactNode> = {
    bald: null,
    short: (
      <>
        <ellipse cx={cx} cy={faceCy - s * 0.15} rx={s * 0.22} ry={s * 0.12} fill={hair} />
        <ellipse cx={cx - s*0.19} cy={faceCy - s*0.06} rx={s*0.05} ry={s*0.08} fill={hair} />
        <ellipse cx={cx + s*0.19} cy={faceCy - s*0.06} rx={s*0.05} ry={s*0.08} fill={hair} />
      </>
    ),
    pixie: (
      <>
        <ellipse cx={cx} cy={faceCy - s * 0.16} rx={s * 0.22} ry={s * 0.14} fill={hair} />
        <ellipse cx={cx - s * 0.18} cy={faceCy - s * 0.07} rx={s * 0.06} ry={s * 0.09} fill={hair} />
        <ellipse cx={cx + s * 0.18} cy={faceCy - s * 0.07} rx={s * 0.06} ry={s * 0.09} fill={hair} />
      </>
    ),
    medium: (
      <>
        <ellipse cx={cx} cy={faceCy - s * 0.13} rx={s * 0.24} ry={s * 0.18} fill={hair} />
        <ellipse cx={cx - s*0.21} cy={faceCy + s*0.07} rx={s*0.05} ry={s*0.09} fill={hair} />
        <ellipse cx={cx + s*0.21} cy={faceCy + s*0.07} rx={s*0.05} ry={s*0.09} fill={hair} />
      </>
    ),
    long: (
      <>
        <ellipse cx={cx} cy={faceCy - s * 0.13} rx={s * 0.24} ry={s * 0.18} fill={hair} />
        <rect x={cx - s * 0.235} y={faceCy - s * 0.04} width={s * 0.1} height={s * 0.35} rx={5} fill={hair} />
        <rect x={cx + s * 0.135} y={faceCy - s * 0.04} width={s * 0.1} height={s * 0.35} rx={5} fill={hair} />
      </>
    ),
    waves: (
      <>
        <ellipse cx={cx} cy={faceCy - s * 0.13} rx={s * 0.24} ry={s * 0.18} fill={hair} />
        <rect x={cx - s * 0.235} y={faceCy - s * 0.04} width={s * 0.1} height={s * 0.28} rx={5} fill={hair} />
        <rect x={cx + s * 0.135} y={faceCy - s * 0.04} width={s * 0.1} height={s * 0.28} rx={5} fill={hair} />
        <path d={`M ${cx - s*0.235} ${faceCy + s*0.14} Q ${cx - s*0.17} ${faceCy + s*0.2} ${cx - s*0.11} ${faceCy + s*0.14}`} stroke={hair} strokeWidth={s * 0.06} fill="none" strokeLinecap="round" />
        <path d={`M ${cx + s*0.135} ${faceCy + s*0.14} Q ${cx + s*0.2} ${faceCy + s*0.2} ${cx + s*0.26} ${faceCy + s*0.14}`} stroke={hair} strokeWidth={s * 0.06} fill="none" strokeLinecap="round" />
      </>
    ),
    bangs: (
      <>
        <ellipse cx={cx} cy={faceCy - s * 0.13} rx={s * 0.24} ry={s * 0.18} fill={hair} />
        <rect x={cx - s * 0.235} y={faceCy - s * 0.04} width={s * 0.1} height={s * 0.35} rx={5} fill={hair} />
        <rect x={cx + s * 0.135} y={faceCy - s * 0.04} width={s * 0.1} height={s * 0.35} rx={5} fill={hair} />
        {/* Bangs strip over forehead */}
        <rect x={cx - s * 0.22} y={faceCy - s * 0.22} width={s * 0.44} height={s * 0.1} rx={3} fill={hair} />
      </>
    ),
    bun: (
      <>
        <ellipse cx={cx} cy={faceCy - s * 0.14} rx={s * 0.24} ry={s * 0.16} fill={hair} />
        <circle cx={cx} cy={faceCy - s * 0.34} r={s * 0.1} fill={hair} />
        <circle cx={cx} cy={faceCy - s * 0.34} r={s * 0.055} fill={hair} opacity={0.55} />
      </>
    ),
    ponytail: (
      <>
        <ellipse cx={cx} cy={faceCy - s * 0.14} rx={s * 0.24} ry={s * 0.16} fill={hair} />
        <rect x={cx + s * 0.15} y={faceCy - s * 0.18} width={s * 0.07} height={s * 0.35} rx={4} fill={hair} />
      </>
    ),
    curly: (
      <>
        {[-0.18, -0.07, 0.04, 0.13].map((dx, i) => (
          <circle key={i} cx={cx + dx * s} cy={faceCy - s * 0.19} r={s * 0.09} fill={hair} />
        ))}
        <ellipse cx={cx - s*0.2} cy={faceCy - s*0.06} rx={s*0.07} ry={s*0.11} fill={hair} />
        <ellipse cx={cx + s*0.2} cy={faceCy - s*0.06} rx={s*0.07} ry={s*0.11} fill={hair} />
      </>
    ),
    twintails: (
      <>
        <ellipse cx={cx} cy={faceCy - s * 0.14} rx={s * 0.24} ry={s * 0.16} fill={hair} />
        <rect x={cx - s * 0.29} y={faceCy - s * 0.19} width={s * 0.07} height={s * 0.36} rx={3} fill={hair} />
        <ellipse cx={cx - s * 0.255} cy={faceCy + s * 0.17} rx={s * 0.05} ry={s * 0.03} fill={hair} />
        <rect x={cx + s * 0.22} y={faceCy - s * 0.19} width={s * 0.07} height={s * 0.36} rx={3} fill={hair} />
        <ellipse cx={cx + s * 0.255} cy={faceCy + s * 0.17} rx={s * 0.05} ry={s * 0.03} fill={hair} />
      </>
    ),
    braids: (
      <>
        <ellipse cx={cx} cy={faceCy - s * 0.14} rx={s * 0.24} ry={s * 0.16} fill={hair} />
        <rect x={cx - s * 0.245} y={faceCy - s * 0.02} width={s * 0.1} height={s * 0.34} rx={3} fill={hair} />
        <rect x={cx + s * 0.145} y={faceCy - s * 0.02} width={s * 0.1} height={s * 0.34} rx={3} fill={hair} />
        {[0.02, 0.1, 0.18, 0.26].map((dy, i) => (
          <React.Fragment key={i}>
            <line x1={cx - s*0.245} y1={faceCy + dy*s} x2={cx - s*0.145} y2={faceCy + (dy+0.05)*s} stroke={hair} strokeWidth={2.5} opacity={0.5} />
            <line x1={cx + s*0.245} y1={faceCy + dy*s} x2={cx + s*0.145} y2={faceCy + (dy+0.05)*s} stroke={hair} strokeWidth={2.5} opacity={0.5} />
          </React.Fragment>
        ))}
      </>
    ),
  };

  // Male hair styles
  const maleHairPaths: Record<string, React.ReactNode> = {
    bald: null,
    buzz: (
      // Very short all over
      <ellipse cx={cx} cy={faceCy - s * 0.16} rx={s * 0.225} ry={s * 0.105} fill={hair} />
    ),
    sidepart: (
      <>
        {/* Main mass */}
        <ellipse cx={cx} cy={faceCy - s * 0.16} rx={s * 0.225} ry={s * 0.13} fill={hair} />
        {/* Left side longer */}
        <ellipse cx={cx - s*0.18} cy={faceCy - s*0.08} rx={s*0.06} ry={s*0.09} fill={hair} />
        <ellipse cx={cx + s*0.18} cy={faceCy - s*0.08} rx={s*0.055} ry={s*0.075} fill={hair} />
        {/* Part line highlight */}
        <line x1={cx - s*0.04} y1={faceCy - s*0.22} x2={cx - s*0.12} y2={faceCy - s*0.08} stroke={hair} strokeWidth={s*0.025} strokeLinecap="round" opacity={0.4} />
      </>
    ),
    pompadour: (
      <>
        {/* Sides */}
        <ellipse cx={cx - s*0.18} cy={faceCy - s*0.08} rx={s*0.055} ry={s*0.085} fill={hair} />
        <ellipse cx={cx + s*0.18} cy={faceCy - s*0.08} rx={s*0.055} ry={s*0.085} fill={hair} />
        {/* Base */}
        <ellipse cx={cx} cy={faceCy - s*0.17} rx={s*0.225} ry={s*0.11} fill={hair} />
        {/* Pompadour quiff - raised front */}
        <ellipse cx={cx} cy={faceCy - s*0.28} rx={s*0.13} ry={s*0.1} fill={hair} />
        <ellipse cx={cx} cy={faceCy - s*0.32} rx={s*0.09} ry={s*0.07} fill={hair} />
      </>
    ),
    undercut: (
      <>
        {/* Shaved sides (skin colored thin strip) */}
        <ellipse cx={cx - s*0.2} cy={faceCy - s*0.06} rx={s*0.04} ry={s*0.1} fill={skin} opacity={0.6} />
        <ellipse cx={cx + s*0.2} cy={faceCy - s*0.06} rx={s*0.04} ry={s*0.1} fill={skin} opacity={0.6} />
        {/* Top volume */}
        <ellipse cx={cx} cy={faceCy - s*0.18} rx={s*0.2} ry={s*0.14} fill={hair} />
      </>
    ),
    curly: (
      <>
        {[-0.17, -0.06, 0.05, 0.14].map((dx, i) => (
          <circle key={i} cx={cx + dx * s} cy={faceCy - s * 0.19} r={s * 0.09} fill={hair} />
        ))}
        <ellipse cx={cx - s*0.19} cy={faceCy - s*0.07} rx={s*0.065} ry={s*0.1} fill={hair} />
        <ellipse cx={cx + s*0.19} cy={faceCy - s*0.07} rx={s*0.065} ry={s*0.1} fill={hair} />
      </>
    ),
    medium: (
      <>
        <ellipse cx={cx} cy={faceCy - s*0.14} rx={s*0.235} ry={s*0.17} fill={hair} />
        <ellipse cx={cx - s*0.2} cy={faceCy + s*0.04} rx={s*0.055} ry={s*0.08} fill={hair} />
        <ellipse cx={cx + s*0.2} cy={faceCy + s*0.04} rx={s*0.055} ry={s*0.08} fill={hair} />
      </>
    ),
    short: (
      <>
        <ellipse cx={cx} cy={faceCy - s*0.16} rx={s*0.225} ry={s*0.12} fill={hair} />
        <ellipse cx={cx - s*0.19} cy={faceCy - s*0.07} rx={s*0.05} ry={s*0.075} fill={hair} />
        <ellipse cx={cx + s*0.19} cy={faceCy - s*0.07} rx={s*0.05} ry={s*0.075} fill={hair} />
      </>
    ),
    ponytail: (
      <>
        <ellipse cx={cx} cy={faceCy - s*0.15} rx={s*0.225} ry={s*0.14} fill={hair} />
        <rect x={cx + s*0.16} y={faceCy - s*0.14} width={s*0.065} height={s*0.3} rx={3} fill={hair} />
      </>
    ),
  };

  const hairPaths = isMale ? maleHairPaths : femaleHairPaths;

  /* ── Ears ─── */
  const earY = faceCy - s * 0.01;
  const earXL = cx - faceRx - s * 0.01;
  const earXR = cx + faceRx + s * 0.01;

  /* ── Earrings ─── */
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

  /* ── Eyes ─── */
  const eyeLY = faceCy - s * 0.045;
  const eyeSpread = s * 0.075;
  const eyeRx = isMale ? s * 0.038 : s * 0.036;
  const eyeRy = isMale ? s * 0.03  : s * 0.032;

  const eyeEl = (() => {
    if (config.expression === 'wink') {
      return (
        <>
          {/* Left eye - open */}
          <ellipse cx={cx - eyeSpread} cy={eyeLY} rx={eyeRx * 1.15} ry={eyeRy * 1.15} fill="white" />
          <ellipse cx={cx - eyeSpread} cy={eyeLY} rx={eyeRx * 0.72} ry={eyeRy * 0.72} fill={eye} />
          <ellipse cx={cx - eyeSpread} cy={eyeLY} rx={eyeRx * 0.38} ry={eyeRy * 0.38} fill="#111" />
          <circle cx={cx - eyeSpread + eyeRx*0.32} cy={eyeLY - eyeRy*0.3} r={eyeRx * 0.22} fill="white" opacity={0.9} />
          {/* Right eye - wink */}
          <path d={`M ${cx + eyeSpread - eyeRx} ${eyeLY} Q ${cx + eyeSpread} ${eyeLY + eyeRy * 0.7} ${cx + eyeSpread + eyeRx} ${eyeLY}`}
            stroke={eye} strokeWidth={s*0.018} fill="none" strokeLinecap="round" />
        </>
      );
    }
    return (
      <>
        {/* Left eye */}
        <ellipse cx={cx - eyeSpread} cy={eyeLY} rx={eyeRx * 1.15} ry={eyeRy * 1.15} fill="white" />
        <ellipse cx={cx - eyeSpread} cy={eyeLY} rx={eyeRx * 0.72} ry={eyeRy * 0.72} fill={eye} />
        <ellipse cx={cx - eyeSpread} cy={eyeLY} rx={eyeRx * 0.38} ry={eyeRy * 0.38} fill="#111" />
        <circle cx={cx - eyeSpread + eyeRx*0.32} cy={eyeLY - eyeRy*0.3} r={eyeRx * 0.22} fill="white" opacity={0.9} />
        {/* Right eye */}
        <ellipse cx={cx + eyeSpread} cy={eyeLY} rx={eyeRx * 1.15} ry={eyeRy * 1.15} fill="white" />
        <ellipse cx={cx + eyeSpread} cy={eyeLY} rx={eyeRx * 0.72} ry={eyeRy * 0.72} fill={eye} />
        <ellipse cx={cx + eyeSpread} cy={eyeLY} rx={eyeRx * 0.38} ry={eyeRy * 0.38} fill="#111" />
        <circle cx={cx + eyeSpread + eyeRx*0.32} cy={eyeLY - eyeRy*0.3} r={eyeRx * 0.22} fill="white" opacity={0.9} />
      </>
    );
  })();

  /* ── Eyebrows ─── */
  // Derive brow color from hair (slightly darker)
  const browColor = hair === '#FFFFFF' || hair === '#E5E5E5' ? '#8a8a8a' : hair;
  const browY = eyeLY - s * 0.055;
  const browW = isMale ? s * 0.068 : s * 0.055;
  const browThick = isMale ? s * 0.018 : s * 0.012;

  const browEl = (() => {
    if (isMale) {
      // Straight thick brows for male
      return (
        <>
          <path
            d={`M ${cx - eyeSpread - browW} ${browY + s*0.008} L ${cx - eyeSpread + browW} ${browY}`}
            stroke={browColor} strokeWidth={browThick} strokeLinecap="round" fill="none"
          />
          <path
            d={`M ${cx + eyeSpread - browW} ${browY} L ${cx + eyeSpread + browW} ${browY + s*0.008}`}
            stroke={browColor} strokeWidth={browThick} strokeLinecap="round" fill="none"
          />
        </>
      );
    }
    // Arched thin brows for female
    return (
      <>
        <path
          d={`M ${cx - eyeSpread - browW} ${browY + s*0.012} Q ${cx - eyeSpread} ${browY - s*0.008} ${cx - eyeSpread + browW} ${browY + s*0.012}`}
          stroke={browColor} strokeWidth={browThick} strokeLinecap="round" fill="none"
        />
        <path
          d={`M ${cx + eyeSpread - browW} ${browY + s*0.012} Q ${cx + eyeSpread} ${browY - s*0.008} ${cx + eyeSpread + browW} ${browY + s*0.012}`}
          stroke={browColor} strokeWidth={browThick} strokeLinecap="round" fill="none"
        />
      </>
    );
  })();

  /* ── Eyelashes ─── */
  const eyelashEl = (() => {
    if (config.eyelashes === 'none') return null;
    const count = config.eyelashes === 'dramatic' ? 5 : config.eyelashes === 'wispy' ? 3 : 4;
    const len   = config.eyelashes === 'dramatic' ? s * 0.045 : s * 0.03;
    const lashes: React.ReactNode[] = [];
    const eyeCenters = [cx - eyeSpread, cx + eyeSpread];
    eyeCenters.forEach((ex, ei) => {
      for (let i = 0; i < count; i++) {
        const t = count <= 1 ? 0.5 : i / (count - 1);
        const angle = (-160 + t * 100) * Math.PI / 180;
        const r = eyeRy * 1.1;
        const bx = ex + Math.cos(angle) * r;
        const by = eyeLY + Math.sin(angle) * r;
        const tx = ex + Math.cos(angle) * (r + len);
        const ty = eyeLY + Math.sin(angle) * (r + len);
        lashes.push(
          <line key={`${ei}-${i}`} x1={bx} y1={by} x2={tx} y2={ty}
            stroke="#1a1a1a" strokeWidth={1.2} strokeLinecap="round" />
        );
      }
    });
    return <>{lashes}</>;
  })();

  /* ── Nose ─── */
  const noseY = faceCy + s * 0.02;
  const noseEl = (
    <path
      d={`M ${cx - s*0.025} ${noseY} Q ${cx} ${noseY + s*0.04} ${cx + s*0.025} ${noseY}`}
      stroke={skin} strokeWidth={isMale ? s*0.018 : s*0.013}
      fill="none" strokeLinecap="round" opacity={0.5}
    />
  );

  /* ── Mouth ─── */
  const mouthY = faceCy + s * 0.075;
  const mouthColor = lipColor || (isMale ? '#a06050' : '#b07060');
  const mouthEl = (() => {
    if (config.expression === 'kiss') return (
      <ellipse cx={cx} cy={mouthY} rx={s * 0.032} ry={s * 0.025} fill={mouthColor} />
    );
    if (config.expression === 'cute') return (
      <path d={`M ${cx - s*0.065} ${mouthY - s*0.01} Q ${cx} ${mouthY + s*0.055} ${cx + s*0.065} ${mouthY - s*0.01}`}
        stroke={mouthColor} strokeWidth={s*0.016} fill={lipColor ? lipColor : 'none'}
        strokeLinecap="round" opacity={lipColor ? 0.85 : 1} />
    );
    if (config.expression === 'smirk') return (
      <path d={`M ${cx - s*0.035} ${mouthY + s*0.01} Q ${cx + s*0.025} ${mouthY + s*0.03} ${cx + s*0.07} ${mouthY - s*0.01}`}
        stroke={mouthColor} strokeWidth={s*0.015} fill="none" strokeLinecap="round" />
    );
    if (['happy', 'excited', 'cool', 'wink'].includes(config.expression)) return (
      <path d={`M ${cx - s*0.065} ${mouthY - s*0.005} Q ${cx} ${mouthY + s*0.05} ${cx + s*0.065} ${mouthY - s*0.005}`}
        stroke={mouthColor} strokeWidth={s*0.015} fill="none" strokeLinecap="round" />
    );
    if (['neutral', 'focused', 'serious'].includes(config.expression)) return (
      <line x1={cx - s*0.055} y1={mouthY} x2={cx + s*0.055} y2={mouthY}
        stroke={mouthColor} strokeWidth={s*0.015} strokeLinecap="round" />
    );
    // tired / silly / default (slight frown)
    return (
      <path d={`M ${cx - s*0.065} ${mouthY + s*0.02} Q ${cx} ${mouthY - s*0.02} ${cx + s*0.065} ${mouthY + s*0.02}`}
        stroke={mouthColor} strokeWidth={s*0.015} fill="none" strokeLinecap="round" />
    );
  })();

  /* ── Beard ─── */
  const beardEl = (() => {
    if (!isMale || config.beard === 'none') return null;
    const beardColor = hair;
    const jawY = faceCy + faceRy * 0.7;

    if (config.beard === 'stubble') return (
      <ellipse cx={cx} cy={jawY} rx={s*0.16} ry={s*0.07}
        fill={beardColor} opacity={0.35} />
    );
    if (config.beard === 'goatee') return (
      <>
        {/* Chin patch */}
        <ellipse cx={cx} cy={jawY + s*0.02} rx={s*0.07} ry={s*0.055} fill={beardColor} opacity={0.75} />
        {/* Mustache */}
        <path d={`M ${cx - s*0.06} ${mouthY - s*0.01} Q ${cx} ${mouthY + s*0.02} ${cx + s*0.06} ${mouthY - s*0.01}`}
          stroke={beardColor} strokeWidth={s*0.025} fill="none" strokeLinecap="round" opacity={0.8} />
      </>
    );
    if (config.beard === 'short') return (
      <>
        <ellipse cx={cx} cy={jawY + s*0.01} rx={s*0.18} ry={s*0.1} fill={beardColor} opacity={0.65} />
        {/* Mustache */}
        <path d={`M ${cx - s*0.075} ${mouthY - s*0.01} Q ${cx} ${mouthY + s*0.025} ${cx + s*0.075} ${mouthY - s*0.01}`}
          stroke={beardColor} strokeWidth={s*0.028} fill="none" strokeLinecap="round" opacity={0.75} />
      </>
    );
    if (config.beard === 'full') return (
      <>
        <ellipse cx={cx} cy={jawY + s*0.02} rx={s*0.21} ry={s*0.13} fill={beardColor} opacity={0.8} />
        {/* Cheeks */}
        <ellipse cx={cx - s*0.14} cy={faceCy + s*0.12} rx={s*0.07} ry={s*0.09} fill={beardColor} opacity={0.6} />
        <ellipse cx={cx + s*0.14} cy={faceCy + s*0.12} rx={s*0.07} ry={s*0.09} fill={beardColor} opacity={0.6} />
        {/* Mustache */}
        <path d={`M ${cx - s*0.085} ${mouthY - s*0.01} Q ${cx} ${mouthY + s*0.03} ${cx + s*0.085} ${mouthY - s*0.01}`}
          stroke={beardColor} strokeWidth={s*0.032} fill="none" strokeLinecap="round" opacity={0.85} />
      </>
    );
    return null;
  })();

  /* ── Body / shoulders ─── */
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
    casual:    '#3498DB',
  };
  const bodyColor = outfitColor[config.outfit] ?? '#3498DB';

  // Shoulder width: male wider
  const shoulderW = isMale ? s * 0.34 : s * 0.26;
  const shoulderY = cy + s * 0.27;
  const neckW = isMale ? s * 0.09 : s * 0.075;
  const neckH = isMale ? s * 0.1 : s * 0.12;

  const bodyEl = (
    <>
      {/* Neck */}
      <rect x={cx - neckW} y={faceCy + faceRy - s*0.01} width={neckW * 2} height={neckH} rx={neckW * 0.4} fill={skin} />
      {/* Shoulders / torso — organic path */}
      <path
        d={`M ${cx - shoulderW} ${s * 0.98}
            L ${cx - shoulderW} ${shoulderY + s*0.03}
            Q ${cx - shoulderW + s*0.04} ${shoulderY - s*0.02} ${cx - neckW - s*0.04} ${faceCy + faceRy + neckH - s*0.01}
            L ${cx + neckW + s*0.04} ${faceCy + faceRy + neckH - s*0.01}
            Q ${cx + shoulderW - s*0.04} ${shoulderY - s*0.02} ${cx + shoulderW} ${shoulderY + s*0.03}
            L ${cx + shoulderW} ${s * 0.98} Z`}
        fill={bodyColor}
      />
    </>
  );

  /* ── Blush ─── */
  const blushEl = blushColor ? (
    <>
      <ellipse cx={cx - s * 0.135} cy={faceCy + s * 0.03} rx={s * 0.065} ry={s * 0.038} fill={blushColor} />
      <ellipse cx={cx + s * 0.135} cy={faceCy + s * 0.03} rx={s * 0.065} ry={s * 0.038} fill={blushColor} />
    </>
  ) : null;

  /* ── Container ─── */
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
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={s * 0.48} fill={color} />
        {/* Mood ring */}
        <circle cx={cx} cy={cy} r={s * 0.48} fill="none" stroke={moodColor} strokeWidth={3} opacity={0.7} />

        {/* Hair BEHIND face */}
        {hairPaths[config.hairStyle] ?? (isMale ? hairPaths.short : hairPaths.medium)}

        {/* Body / shoulders */}
        {bodyEl}

        {/* Ear nubs */}
        <ellipse cx={earXL} cy={earY} rx={s*0.038} ry={s*0.05} fill={skin} />
        <ellipse cx={earXR} cy={earY} rx={s*0.038} ry={s*0.05} fill={skin} />

        {/* Face */}
        <ellipse cx={cx} cy={faceCy} rx={faceRx} ry={faceRy} fill={skin} />

        {/* Male chin definition (subtle) */}
        {isMale && (
          <ellipse cx={cx} cy={faceCy + faceRy * 0.78} rx={s*0.13} ry={s*0.06}
            fill={skin} opacity={0.5} />
        )}

        {/* Blush */}
        {blushEl}

        {/* Beard (behind mouth/nose, in front of face) */}
        {beardEl}

        {/* Earrings */}
        {earringEl}

        {/* Eyebrows */}
        {browEl}

        {/* Eyes */}
        {eyeEl}

        {/* Eyelashes */}
        {eyelashEl}

        {/* Nose */}
        {noseEl}

        {/* Mouth */}
        {mouthEl}

        {/* Lipstick gloss */}
        {lipColor && config.expression !== 'kiss' && (
          <ellipse cx={cx - s*0.018} cy={mouthY + s*0.005} rx={s*0.018} ry={s*0.006} fill="white" opacity={0.35} />
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
