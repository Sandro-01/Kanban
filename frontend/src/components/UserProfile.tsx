import React, { useState } from 'react';
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
  // Makeup & feminine features
  lipstick: string;
  blush: string;
  eyelashes: string;
  earring: string;
  nailColor: string;
}

interface UserProfileProps {
  user: any;
  onUserUpdate?: (updatedUser: any) => void;
}

// ─── Config Options ───────────────────────────────────────────────────────────

const SKIN_TONES = [
  { id: 'light',  label: 'Chiara',      color: '#FFDBB4' },
  { id: 'medium', label: 'Dorata',      color: '#D4956A' },
  { id: 'tan',    label: 'Abbronzata',  color: '#C68642' },
  { id: 'dark',   label: 'Scura',       color: '#8D5524' },
  { id: 'deep',   label: 'Profonda',    color: '#4A2912' },
];

const HAIR_STYLES = [
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

const HAIR_COLORS = [
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

const EYE_COLORS = [
  { id: 'brown',  label: 'Marrone',  color: '#8B6914' },
  { id: 'blue',   label: 'Blu',      color: '#4A90D9' },
  { id: 'green',  label: 'Verde',    color: '#2D8653' },
  { id: 'hazel',  label: 'Nocciola', color: '#A0784C' },
  { id: 'gray',   label: 'Grigio',   color: '#8B9DC3' },
  { id: 'black',  label: 'Nero',     color: '#1a1a1a' },
  { id: 'violet', label: 'Viola',    color: '#9B59B6' },
  { id: 'teal',   label: 'Teal',     color: '#008B8B' },
];

const OUTFITS = [
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

const ACCESSORIES = [
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

const EXPRESSIONS = [
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

const MOODS = [
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

const BADGES = [
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

// ─── Makeup Options ───────────────────────────────────────────────────────────

const LIPSTICKS = [
  { id: 'none',  label: 'Nessuno', color: '' },
  { id: 'pink',  label: 'Rosa',    color: '#FF69B4' },
  { id: 'red',   label: 'Rosso',   color: '#DC143C' },
  { id: 'coral', label: 'Corallo', color: '#FF7F50' },
  { id: 'mauve', label: 'Malva',   color: '#C9859E' },
  { id: 'nude',  label: 'Nude',    color: '#D2967A' },
  { id: 'berry', label: 'Berry',   color: '#8B0057' },
  { id: 'plum',  label: 'Prugna',  color: '#7B2D8B' },
];

const BLUSHES = [
  { id: 'none',   label: 'Nessuno',  color: '' },
  { id: 'soft',   label: 'Delicato', color: 'rgba(255,182,193,0.45)' },
  { id: 'rosy',   label: 'Rosato',   color: 'rgba(219,112,147,0.4)' },
  { id: 'peach',  label: 'Pesca',    color: 'rgba(255,160,122,0.4)' },
  { id: 'bronze', label: 'Bronzo',   color: 'rgba(180,100,50,0.3)' },
];

const EYELASHES_OPTS = [
  { id: 'none',     label: 'Nessuna',   emoji: '👁️' },
  { id: 'natural',  label: 'Naturale',  emoji: '✨' },
  { id: 'dramatic', label: 'Voluminoso',emoji: '💃' },
  { id: 'wispy',    label: 'Leggero',   emoji: '🪶' },
];

const EARRINGS = [
  { id: 'none',     label: 'Nessuno',   emoji: '✖️' },
  { id: 'studs',    label: 'Lobo',      emoji: '🟡' },
  { id: 'hoops',    label: 'Cerchi',    emoji: '⭕' },
  { id: 'drops',    label: 'Gocce',     emoji: '💧' },
  { id: 'pearls',   label: 'Perle',     emoji: '🫧' },
  { id: 'stars',    label: 'Stelle',    emoji: '⭐' },
  { id: 'hearts',   label: 'Cuoricini', emoji: '💕' },
  { id: 'crystals', label: 'Cristalli', emoji: '💎' },
];

const NAIL_COLORS = [
  { id: 'none',         label: 'Naturale',   color: '#F5DEB3' },
  { id: 'pink',         label: 'Rosa',       color: '#FF69B4' },
  { id: 'red',          label: 'Rosso',      color: '#DC143C' },
  { id: 'purple',       label: 'Viola',      color: '#9B59B6' },
  { id: 'nude',         label: 'Nude',       color: '#D2B48C' },
  { id: 'black',        label: 'Nero',       color: '#1a1a1a' },
  { id: 'french',       label: 'French',     color: '#FFF5EE' },
  { id: 'glitter',      label: 'Glitter',    color: '#FFD700' },
  { id: 'holographic',  label: 'Olografico', color: '#B0E0E6' },
  { id: 'coral',        label: 'Corallo',    color: '#FF7F50' },
];

const AVATAR_COLORS = [
  '#DB2777', '#EC4899', '#F472B6', '#9333EA',
  '#7C3AED', '#4F46E5', '#0284C7', '#059669',
  '#D97706', '#DC2626', '#374151', '#166534',
];

const DEFAULT_CONFIG: AvatarConfig = {
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

// ─── Avatar SVG Preview ───────────────────────────────────────────────────────

function AvatarPreview({ config, color, size = 120 }: { config: AvatarConfig; color: string; size?: number }) {
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

  // Hair paths by style
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

  // Earring SVG shapes
  const earY = cy - s * 0.03;
  const earXL = cx - s * 0.23;
  const earXR = cx + s * 0.23;
  const earringEl = (() => {
    if (config.earring === 'none') return null;
    const gold = '#FFD700';
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

  // Eyelash lines
  const eyeLY = cy - s * 0.06;
  const eyelashEl = (() => {
    if (config.eyelashes === 'none') return null;
    const count = config.eyelashes === 'dramatic' ? 5 : config.eyelashes === 'wispy' ? 3 : 4;
    const len   = config.eyelashes === 'dramatic' ? s * 0.045 : s * 0.03;
    const lashes: React.ReactNode[] = [];
    const eyeCenters = [cx - s * 0.07, cx + s * 0.07];
    eyeCenters.forEach((ex, ei) => {
      for (let i = 0; i < count; i++) {
        const t = count < 2 ? 0.5 : i / (count - 1);
        const angle = (-160 + t * 100) * Math.PI / 180; // top arc
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

  // Mouth color
  const mouthColor = lipColor || '#8B6914';
  const mouthStroke = lipColor ? 'none' : 'none';

  // Outfit body color
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

  return (
    <div className="avatar-preview" style={{ width: s, height: s }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
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
            {/* Winked right eye */}
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
          <>
            <ellipse cx={cx} cy={cy + s * 0.06} rx={s * 0.035} ry={s * 0.025} fill={mouthColor || '#D2967A'} />
          </>
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
