import React, { useRef } from 'react';
import { UPLOADS_URL } from '../services/api';

// Palette identica a quella del backend — stessa funzione hash → stesso colore
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
}

interface UserAvatarProps {
  user: AvatarUser;
  /** CSS class applied to the root element (handles size/font/display) */
  className?: string;
  /** Extra inline styles (merged on top of className rules) */
  style?: React.CSSProperties;
  /** If true, a file-picker opens on click and calls onUpload */
  editable?: boolean;
  onUpload?: (file: File) => void;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  className,
  style,
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

  const handleClick = editable ? () => inputRef.current?.click() : undefined;

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
