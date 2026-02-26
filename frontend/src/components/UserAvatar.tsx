import React, { useEffect, useRef, useState } from 'react';
import { UPLOADS_URL } from '../services/api';
import { AvatarPreview, DEFAULT_CONFIG, MALE_DEFAULT_CONFIG } from './AvatarSVG';

// Palette identica al backend — stesso hash → stesso colore
const AVATAR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#10b981', '#06b6d4', '#eab308', '#84cc16', '#f43f5e',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export interface AvatarUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarColor?: string | null;
  avatarUrl?: string | null;
  avatarConfig?: string | null;   // JSON string from react-nice-avatar
}

interface UserAvatarProps {
  user: AvatarUser;
  /** CSS class applied to the root element (handles size/font/display via CSS) */
  className?: string;
  /** Extra inline styles merged on top */
  style?: React.CSSProperties;
  /** Generic click handler (used by Header dropdown) */
  onClick?: () => void;
  /** If true, a file-picker opens on click (for uploading a real photo) */
  editable?: boolean;
  onUpload?: (file: File) => void;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  className,
  style,
  onClick,
  editable,
  onUpload,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // imgError: 0 = not tried, 1 = scene URL failed (try plain), 2 = all failed (show DiceBear)
  const [imgError, setImgError] = useState(0);
  // Reset error counter whenever the avatar URL changes (new upload, etc.)
  useEffect(() => { setImgError(0); }, [user.avatarUrl]);

  const initials =
    `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() ||
    (user.email ? (user.email[0] || '?').toUpperCase() : '?');

  const nameForColor =
    user.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : user.email || '?';

  const bg = user.avatarColor || getAvatarColor(nameForColor);

  const handleClick = onClick || (editable ? () => inputRef.current?.click() : undefined);

  const fileInput = editable ? (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      style={{ display: 'none' }}
      onChange={e => {
        if (e.target.files?.[0]) onUpload?.(e.target.files[0]);
        e.target.value = '';
      }}
    />
  ) : null;

  // ── Priority 1: real photo or external avatar (e.g. Ready Player Me) ───
  if (user.avatarUrl && imgError < 2) {
    // Base URL: external absolute or local upload path
    const plainSrc = user.avatarUrl.startsWith('http')
      ? user.avatarUrl
      : `${UPLOADS_URL}/${user.avatarUrl}`;

    // For ReadyPlayerMe, try halfbody portrait first (imgError===0),
    // fall back to plain URL on first failure (imgError===1).
    const isRpm = plainSrc.includes('readyplayer.me');
    const src =
      isRpm && imgError === 0 && !plainSrc.includes('scene=')
        ? `${plainSrc}?scene=halfbody-portrait-v1&background=f5f0eb`
        : plainSrc;

    return (
      <div
        className={className}
        style={{ ...style, overflow: 'hidden', padding: 0, cursor: editable ? 'pointer' : undefined }}
        onClick={handleClick}
        title={editable ? 'Click to change photo' : undefined}
      >
        <img
          src={src}
          alt={initials}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgError(prev => prev + 1)}
        />
        {fileInput}
      </div>
    );
  }

  // ── Priority 2: avatar config (SVG custom or legacy react-nice-avatar) ───
  if (user.avatarConfig) {
    let config: any = {};
    try { config = JSON.parse(user.avatarConfig); } catch { /* ignore */ }

    // New SVG-based avatar (has skinTone field)
    if (config.skinTone) {
      const bgColor = config.avatarColor || user.avatarColor || '#DB2777';
      const svgConfig = { ...DEFAULT_CONFIG, ...config };
      return (
        <div
          className={className}
          style={{ ...style, overflow: 'hidden', padding: 0, cursor: editable ? 'pointer' : undefined }}
          onClick={handleClick}
          title={editable ? 'Click to edit avatar' : undefined}
        >
          <AvatarPreview config={svgConfig} color={bgColor} responsive seed={nameForColor} />
          {fileInput}
        </div>
      );
    }

    // Legacy config without skinTone: render with SVG defaults
    return (
      <div
        className={className}
        style={{ ...style, overflow: 'hidden', padding: 0, cursor: editable ? 'pointer' : undefined }}
        onClick={handleClick}
        title={editable ? 'Click to edit avatar' : undefined}
      >
        <AvatarPreview config={{ ...DEFAULT_CONFIG, ...config }} color={user.avatarColor || '#DB2777'} responsive seed={nameForColor} />
        {fileInput}
      </div>
    );
  }

  // ── Priority 3: auto-generated DiceBear adventurer avatar ───────────────
  // Pick male vs female config based on a hash of the user's name so every
  // user gets a consistent character that doesn't look mismatched.
  let nameHash = 0;
  for (let i = 0; i < nameForColor.length; i++)
    nameHash = nameForColor.charCodeAt(i) + ((nameHash << 5) - nameHash);
  const autoConfig = Math.abs(nameHash) % 2 === 0 ? MALE_DEFAULT_CONFIG : DEFAULT_CONFIG;

  return (
    <div
      className={className}
      style={{ ...style, overflow: 'hidden', padding: 0, cursor: editable ? 'pointer' : undefined }}
      onClick={handleClick}
      title={editable ? 'Click to customize avatar' : undefined}
    >
      <AvatarPreview config={autoConfig} color={bg} responsive seed={nameForColor} />
      {fileInput}
    </div>
  );
};

export default UserAvatar;
