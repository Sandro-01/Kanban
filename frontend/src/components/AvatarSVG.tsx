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
  { id: 'female', label: 'Woman', emoji: '👩' },
  { id: 'male',   label: 'Man',   emoji: '👨' },
];

export const SKIN_TONES = [
  { id: 'light',  label: 'Light',  color: '#FFDBB4' },
  { id: 'medium', label: 'Golden', color: '#D4956A' },
  { id: 'tan',    label: 'Tan',    color: '#C68642' },
  { id: 'dark',   label: 'Dark',   color: '#8D5524' },
  { id: 'deep',   label: 'Deep',   color: '#4A2912' },
];

export const FEMALE_HAIR_STYLES = [
  { id: 'short',     label: 'Short',          emoji: '💇' },
  { id: 'medium',    label: 'Medium',          emoji: '👩' },
  { id: 'long',      label: 'Long straight',   emoji: '👱‍♀️' },
  { id: 'waves',     label: 'Wavy',            emoji: '〰️' },
  { id: 'curly',     label: 'Curly',           emoji: '🌀' },
  { id: 'braids',    label: 'Braids',          emoji: '🪢' },
  { id: 'twintails', label: 'Twin tails',      emoji: '👯‍♀️' },
  { id: 'bun',       label: 'Bun',             emoji: '👸' },
  { id: 'ponytail',  label: 'High ponytail',   emoji: '🐴' },
  { id: 'pixie',     label: 'Pixie cut',       emoji: '✂️' },
  { id: 'bangs',     label: 'Bangs',           emoji: '💁‍♀️' },
  { id: 'bald',      label: 'Shaved',          emoji: '🧑‍🦲' },
];

export const MALE_HAIR_STYLES = [
  { id: 'sidepart',  label: 'Side part',  emoji: '💈' },
  { id: 'buzz',      label: 'Buzz cut',   emoji: '✂️' },
  { id: 'pompadour', label: 'Pompadour',  emoji: '🕺' },
  { id: 'undercut',  label: 'Undercut',   emoji: '💇‍♂️' },
  { id: 'curly',     label: 'Curly',      emoji: '🌀' },
  { id: 'medium',    label: 'Medium',     emoji: '👨' },
  { id: 'short',     label: 'Short',      emoji: '👦' },
  { id: 'bald',      label: 'Bald',       emoji: '🧑‍🦲' },
  { id: 'ponytail',  label: 'Ponytail',   emoji: '🐴' },
];

/** Union of all styles for TypeScript — the component picks from the right set */
export const HAIR_STYLES = FEMALE_HAIR_STYLES;

export const HAIR_COLORS = [
  { id: '#1a1a1a', label: 'Black' },
  { id: '#4a3728', label: 'Dark brown' },
  { id: '#8B6914', label: 'Brown' },
  { id: '#C8A951', label: 'Blonde' },
  { id: '#E8C97A', label: 'Honey blonde' },
  { id: '#D2691E', label: 'Copper' },
  { id: '#FF8C69', label: 'Copper red' },
  { id: '#E5E5E5', label: 'Gray' },
  { id: '#FFFFFF', label: 'White' },
  { id: '#FF4444', label: 'Red' },
  { id: '#FF69B4', label: 'Pink' },
  { id: '#FFB6C1', label: 'Light pink' },
  { id: '#9B59B6', label: 'Purple' },
  { id: '#DDA0DD', label: 'Lilac' },
  { id: '#3498DB', label: 'Blue' },
  { id: '#2ECC71', label: 'Green' },
];

export const EYE_COLORS = [
  { id: 'brown',  label: 'Brown',  color: '#8B6914' },
  { id: 'blue',   label: 'Blue',   color: '#4A90D9' },
  { id: 'green',  label: 'Green',  color: '#2D8653' },
  { id: 'hazel',  label: 'Hazel',  color: '#A0784C' },
  { id: 'gray',   label: 'Gray',   color: '#8B9DC3' },
  { id: 'black',  label: 'Black',  color: '#1a1a1a' },
  { id: 'violet', label: 'Violet', color: '#9B59B6' },
  { id: 'teal',   label: 'Teal',   color: '#008B8B' },
];

export const OUTFITS = [
  { id: 'casual',    label: 'Casual',    emoji: '👕' },
  { id: 'dress',     label: 'Dress',     emoji: '👗' },
  { id: 'floral',    label: 'Floral',    emoji: '🌺' },
  { id: 'elegant',   label: 'Elegant',   emoji: '✨' },
  { id: 'princess',  label: 'Princess',  emoji: '👸' },
  { id: 'sport',     label: 'Sport',     emoji: '🏃' },
  { id: 'formal',    label: 'Formal',    emoji: '👔' },
  { id: 'creative',  label: 'Creative',  emoji: '🎨' },
  { id: 'tech',      label: 'Tech',      emoji: '💻' },
  { id: 'ninja',     label: 'Ninja',     emoji: '🥷' },
  { id: 'astronaut', label: 'Astronaut', emoji: '🧑‍🚀' },
  { id: 'chef',      label: 'Chef',      emoji: '🧑‍🍳' },
];

export const ACCESSORIES = [
  { id: 'none',       label: 'None',         emoji: '✖️' },
  { id: 'glasses',    label: 'Glasses',       emoji: '👓' },
  { id: 'sunglasses', label: 'Sunglasses',    emoji: '🕶️' },
  { id: 'headband',   label: 'Headband',      emoji: '🎀' },
  { id: 'tiara',      label: 'Tiara',         emoji: '💫' },
  { id: 'flower',     label: 'Flower',        emoji: '🌸' },
  { id: 'bow',        label: 'Bow',           emoji: '🎗️' },
  { id: 'crown',      label: 'Crown',         emoji: '👑' },
  { id: 'hat',        label: 'Hat',           emoji: '🎩' },
  { id: 'cap',        label: 'Cap',           emoji: '🧢' },
  { id: 'headphones', label: 'Headphones',    emoji: '🎧' },
  { id: 'veil',       label: 'Bridal veil',   emoji: '🤍' },
];

export const EXPRESSIONS = [
  { id: 'happy',   label: 'Happy',   emoji: '😄' },
  { id: 'cute',    label: 'Cute',    emoji: '🥰' },
  { id: 'wink',    label: 'Wink',    emoji: '😉' },
  { id: 'kiss',    label: 'Kiss',    emoji: '😘' },
  { id: 'excited', label: 'Excited', emoji: '🤩' },
  { id: 'cool',    label: 'Cool',    emoji: '😎' },
  { id: 'smirk',   label: 'Smirk',   emoji: '😏' },
  { id: 'neutral', label: 'Neutral', emoji: '😐' },
  { id: 'focused', label: 'Focused', emoji: '🧐' },
  { id: 'silly',   label: 'Silly',   emoji: '🤪' },
  { id: 'tired',   label: 'Tired',   emoji: '😴' },
  { id: 'serious', label: 'Serious', emoji: '😤' },
];

export const MOODS = [
  { id: 'romantic',  label: 'Romantic',  emoji: '💕', color: '#FF69B4' },
  { id: 'playful',   label: 'Playful',   emoji: '🎀', color: '#FF85A1' },
  { id: 'energized', label: 'Energized', emoji: '⚡', color: '#F39C12' },
  { id: 'calm',      label: 'Calm',      emoji: '🌊', color: '#3498DB' },
  { id: 'creative',  label: 'Creative',  emoji: '🌈', color: '#9B59B6' },
  { id: 'confident', label: 'Confident', emoji: '💪', color: '#E74C3C' },
  { id: 'social',    label: 'Social',    emoji: '🎉', color: '#2ECC71' },
  { id: 'dreamy',    label: 'Dreamy',    emoji: '🌙', color: '#7C83FD' },
  { id: 'zen',       label: 'Zen',       emoji: '🧘', color: '#1ABC9C' },
  { id: 'focused',   label: 'Focus',     emoji: '🎯', color: '#8B5CF6' },
];

export const BADGES = [
  { id: 'none',      label: 'None',      emoji: '' },
  { id: 'heart',     label: 'Heart',     emoji: '💖' },
  { id: 'butterfly', label: 'Butterfly', emoji: '🦋' },
  { id: 'sparkles',  label: 'Sparkles',  emoji: '✨' },
  { id: 'unicorn',   label: 'Unicorn',   emoji: '🦄' },
  { id: 'flower',    label: 'Flower',    emoji: '🌸' },
  { id: 'rainbow',   label: 'Rainbow',   emoji: '🌈' },
  { id: 'star',      label: 'Star',      emoji: '⭐' },
  { id: 'diamond',   label: 'Diamond',   emoji: '💎' },
  { id: 'trophy',    label: 'Trophy',    emoji: '🏆' },
  { id: 'fire',      label: 'Fire',      emoji: '🔥' },
  { id: 'rocket',    label: 'Rocket',    emoji: '🚀' },
];

export const LIPSTICKS = [
  { id: 'none',  label: 'None',  color: '' },
  { id: 'pink',  label: 'Pink',  color: '#FF69B4' },
  { id: 'red',   label: 'Red',   color: '#DC143C' },
  { id: 'coral', label: 'Coral', color: '#FF7F50' },
  { id: 'mauve', label: 'Mauve', color: '#C9859E' },
  { id: 'nude',  label: 'Nude',  color: '#D2967A' },
  { id: 'berry', label: 'Berry', color: '#8B0057' },
  { id: 'plum',  label: 'Plum',  color: '#7B2D8B' },
];

export const BLUSHES = [
  { id: 'none',   label: 'None',   color: '' },
  { id: 'soft',   label: 'Soft',   color: 'rgba(255,182,193,0.45)' },
  { id: 'rosy',   label: 'Rosy',   color: 'rgba(219,112,147,0.4)' },
  { id: 'peach',  label: 'Peach',  color: 'rgba(255,160,122,0.4)' },
  { id: 'bronze', label: 'Bronze', color: 'rgba(180,100,50,0.3)' },
];

export const EYELASHES_OPTS = [
  { id: 'none',     label: 'None',     emoji: '👁️' },
  { id: 'natural',  label: 'Natural',  emoji: '✨' },
  { id: 'dramatic', label: 'Dramatic', emoji: '💃' },
  { id: 'wispy',    label: 'Wispy',    emoji: '🪶' },
];

export const EARRINGS = [
  { id: 'none',     label: 'None',     emoji: '✖️' },
  { id: 'studs',    label: 'Studs',    emoji: '🟡' },
  { id: 'hoops',    label: 'Hoops',    emoji: '⭕' },
  { id: 'drops',    label: 'Drops',    emoji: '💧' },
  { id: 'pearls',   label: 'Pearls',   emoji: '🫧' },
  { id: 'stars',    label: 'Stars',    emoji: '⭐' },
  { id: 'hearts',   label: 'Hearts',   emoji: '💕' },
  { id: 'crystals', label: 'Crystals', emoji: '💎' },
];

export const NAIL_COLORS = [
  { id: 'none',        label: 'Natural',      color: '#F5DEB3' },
  { id: 'pink',        label: 'Pink',         color: '#FF69B4' },
  { id: 'red',         label: 'Red',          color: '#DC143C' },
  { id: 'purple',      label: 'Purple',       color: '#9B59B6' },
  { id: 'nude',        label: 'Nude',         color: '#D2B48C' },
  { id: 'black',       label: 'Black',        color: '#1a1a1a' },
  { id: 'french',      label: 'French',       color: '#FFF5EE' },
  { id: 'glitter',     label: 'Glitter',      color: '#FFD700' },
  { id: 'holographic', label: 'Holographic',  color: '#B0E0E6' },
  { id: 'coral',       label: 'Coral',        color: '#FF7F50' },
];

export const BEARD_STYLES = [
  { id: 'none',    label: 'None',        emoji: '✖️' },
  { id: 'stubble', label: 'Stubble',     emoji: '🧔' },
  { id: 'goatee',  label: 'Goatee',      emoji: '🧔‍♂️' },
  { id: 'short',   label: 'Short beard', emoji: '🧔' },
  { id: 'full',    label: 'Full beard',  emoji: '🧔‍♂️' },
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
