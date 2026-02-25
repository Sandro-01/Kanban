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

/* ── DiceBear Adventurer URL builder ─────────────────────────────────────── */
/*
 * Uses DiceBear "adventurer" (v9) — full cartoon character (head + shoulders
 * + outfit), closest free equivalent to WhatsApp-style illustrated avatars.
 * API reference: https://www.dicebear.com/styles/adventurer/
 */

const SKIN_HEX: Record<string, string> = {
  light: 'f9c9b6', medium: 'd08b5b', tan: 'ae5d29', dark: '614335', deep: '77311d',
};

/* Hair → adventurer variant (short01–short19 / long01–long26) */
const HAIR_ADV: Record<string, string> = {
  // female
  short:     'short01', pixie:     'short03', bangs:     'short06',
  medium:    'short07', bun:       'long05',  ponytail:  'long09',
  long:      'long01',  waves:     'long14',  curly:     'long18',
  braids:    'long19',  twintails: 'long21',  bald:      'short11',
  // male
  sidepart:  'short05', buzz:      'short11', pompadour: 'short09',
  undercut:  'short13',
};

/* Expression → mouth variant (variant01–variant30) */
const MOUTH_ADV: Record<string, string> = {
  happy:   'variant04', cute:    'variant07', wink:    'variant09',
  kiss:    'variant13', excited: 'variant02', cool:    'variant05',
  smirk:   'variant19', neutral: 'variant20', focused: 'variant22',
  silly:   'variant25', tired:   'variant28', serious: 'variant01',
};

/* Expression → eyes variant (variant01–variant26) */
const EYES_ADV: Record<string, string> = {
  happy:   'variant12', cute:    'variant06', wink:    'variant15',
  kiss:    'variant08', excited: 'variant03', cool:    'variant18',
  smirk:   'variant21', neutral: 'variant01', focused: 'variant05',
  silly:   'variant09', tired:   'variant26', serious: 'variant04',
};

/* Eyebrows matched to expression (variant01–variant15) */
const EYEBROW_ADV: Record<string, string> = {
  happy:   'variant05', cute:    'variant03', wink:    'variant07',
  kiss:    'variant04', excited: 'variant01', cool:    'variant10',
  smirk:   'variant12', neutral: 'variant01', focused: 'variant14',
  silly:   'variant06', tired:   'variant15', serious: 'variant13',
};

/* Outfit → clothing variant (variant01–variant15) */
const OUTFIT_ADV: Record<string, string> = {
  casual:    'variant01', dress:     'variant04', floral:    'variant07',
  elegant:   'variant02', princess:  'variant05', sport:     'variant06',
  formal:    'variant03', creative:  'variant08', tech:      'variant09',
  ninja:     'variant10', astronaut: 'variant11', chef:      'variant12',
};

function buildAvatarUrl(config: AvatarConfig, bgColor: string, seed: string): string {
  const p: string[] = [];

  // Skin tone
  const skin = SKIN_HEX[config.skinTone];
  if (skin) p.push(`skinColor=${skin}`);

  // Hair
  const hair = HAIR_ADV[config.hairStyle];
  if (hair) p.push(`hair=${encodeURIComponent(hair)}`);
  const hairHex = config.hairColor.replace(/^#/, '');
  if (hairHex) p.push(`hairColor=${hairHex}`);

  // Face
  const mouth = MOUTH_ADV[config.expression] ?? 'variant04';
  p.push(`mouth=${encodeURIComponent(mouth)}`);

  const eyes = EYES_ADV[config.expression] ?? 'variant01';
  p.push(`eyes=${encodeURIComponent(eyes)}`);

  const eyebrow = EYEBROW_ADV[config.expression] ?? 'variant01';
  p.push(`eyebrows=${encodeURIComponent(eyebrow)}`);

  // Outfit / clothing
  const outfit = OUTFIT_ADV[config.outfit] ?? 'variant01';
  p.push(`clothing=${encodeURIComponent(outfit)}`);

  // Beard (male)
  if (config.beard && config.beard !== 'none') {
    const beardVariant = config.beard === 'stubble' ? 'variant01'
                       : config.beard === 'goatee'  ? 'variant02'
                       : config.beard === 'short'   ? 'variant03'
                       : 'variant04'; // full
    p.push(`beard=${encodeURIComponent(beardVariant)}`);
  }

  // Glasses
  if (config.accessory === 'glasses') p.push('glasses=variant01');
  else if (config.accessory === 'sunglasses') p.push('glasses=variant04');

  // Background
  const bg = bgColor.replace(/^#/, '');
  if (bg) p.push(`backgroundColor=${bg}`);

  // Seed ensures the avatar is stable for the same config+user combo
  p.push(`seed=${encodeURIComponent(seed)}`);

  return `https://api.dicebear.com/9.x/adventurer/svg?${p.join('&')}`;
}

/* ── AvatarPreview component ─────────────────────────────────────────────── */

export function AvatarPreview({
  config,
  color,
  size = 120,
  responsive = false,
  seed,
}: {
  config: AvatarConfig;
  color: string;
  size?: number;
  responsive?: boolean;
  /** User name / email — used as DiceBear seed for a consistent avatar */
  seed?: string;
}) {
  const avatarSeed = seed || `${config.gender}-${config.skinTone}-${config.hairStyle}-${config.hairColor}`;
  const url = buildAvatarUrl(config, color, avatarSeed);
  const badge = BADGES.find(b => b.id === config.badge)?.emoji ?? '';
  const s = size;
  const containerStyle: React.CSSProperties = responsive
    ? { width: '100%', height: '100%' }
    : { width: s, height: s };

  return (
    <div className="avatar-preview" style={containerStyle}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: color }}>
        <img
          src={url}
          alt="avatar"
          style={{ width: '100%', height: '100%', display: 'block' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
      {badge && (
        <span className="avatar-badge" style={{ fontSize: s * 0.18, bottom: 0, right: -s * 0.04 }}>
          {badge}
        </span>
      )}
    </div>
  );
}
