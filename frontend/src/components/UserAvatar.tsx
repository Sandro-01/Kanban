import React, { useRef } from 'react';
import { UPLOADS_URL } from '../services/api';
import { AvatarPreview, DEFAULT_CONFIG } from './AvatarSVG';

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

  // ── Priority 1: real photo ─────────────────────────────────────────────
  if (user.avatarUrl) {
    return (
      <div
        className={className}
        style={{ ...style, overflow: 'hidden', padding: 0, cursor: editable ? 'pointer' : undefined }}
        onClick={handleClick}
        title={editable ? 'Clicca per cambiare foto' : undefined}
      >
        <img
          src={`${UPLOADS_URL}/${user.avatarUrl}`}
          alt={initials}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
          title={editable ? 'Clicca per modificare avatar' : undefined}
        >
          <AvatarPreview config={svgConfig} color={bgColor} responsive />
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
        title={editable ? 'Clicca per modificare avatar' : undefined}
      >
        <AvatarPreview config={{ ...DEFAULT_CONFIG, ...config }} color={user.avatarColor || '#DB2777'} responsive />
        {fileInput}
      </div>
    );
  }

  // ── Priority 3: coloured initials ─────────────────────────────────────
  return (
    <div
      className={className}
      style={{ background: bg, ...style, cursor: editable ? 'pointer' : undefined }}
      onClick={handleClick}
      title={editable ? 'Clicca per aggiungere foto' : undefined}
    >
      {initials}
      {fileInput}
    </div>
  );
};

export default UserAvatar;
