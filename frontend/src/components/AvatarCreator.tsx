import React, { useState, useEffect, useRef } from 'react';
import './AvatarCreator.css';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface AvatarCreatorProps {
  initialConfig?: string | null;   // JSON string from DB
  onSave: (config: object) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Extract the avatar ID from a RPM .glb URL and return the render PNG URL */
function getRpmPreviewUrl(glbUrl: string): string | null {
  const match = glbUrl.match(/models\.readyplayer\.me\/([^/?#]+)\.glb/);
  if (match) {
    return `https://models.readyplayer.me/${match[1]}.png?scene=fullbody-portrait-v1-transparent&camera=portrait`;
  }
  return null;
}

/* ── Component ─────────────────────────────────────────────────────────── */

const AvatarCreator: React.FC<AvatarCreatorProps> = ({
  initialConfig,
  onSave,
  onRemove,
  onClose,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* Load existing RPM config on mount */
  useEffect(() => {
    if (initialConfig) {
      try {
        const cfg = JSON.parse(initialConfig);
        if (cfg.rpm_url) setAvatarUrl(cfg.rpm_url);
      } catch { /* ignore */ }
    }
  }, [initialConfig]);

  /* Listen for the Ready Player Me "avatar exported" message */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const json = JSON.parse(event.data);
        if (
          json?.source === 'readyplayerme' &&
          json?.eventName === 'v1.avatar.exported'
        ) {
          const url: string = json.data?.url;
          if (url) {
            setAvatarUrl(url);
            setPreviewLoaded(false); // will reload preview image
          }
        }
      } catch { /* ignore non-JSON messages */ }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSave = async () => {
    if (!avatarUrl) return;
    setSaving(true);
    try {
      await onSave({ rpm_url: avatarUrl });
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = avatarUrl ? getRpmPreviewUrl(avatarUrl) : null;

  return (
    <div className="ac-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ac-modal ac-modal--rpm">

        {/* Header */}
        <div className="ac-header">
          <span className="ac-title">Crea il tuo avatar 3D</span>
          <button className="ac-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="ac-rpm-body">

          {/* Live preview strip (shows after the user exports) */}
          {avatarUrl && (
            <div className="ac-rpm-preview-strip">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Anteprima avatar"
                  className={`ac-rpm-preview-img${previewLoaded ? ' loaded' : ''}`}
                  onLoad={() => setPreviewLoaded(true)}
                />
              )}
              <div className="ac-rpm-preview-info">
                <span className="ac-rpm-check">✓</span>
                <span>Avatar creato! Personalizza ancora oppure salva.</span>
              </div>
            </div>
          )}

          {/* Ready Player Me iframe */}
          <iframe
            ref={iframeRef}
            src="https://demo.readyplayer.me/avatar?frameApi&clearBackground=true"
            className="ac-rpm-iframe"
            allow="camera *; microphone *"
            title="Ready Player Me — Crea avatar 3D"
          />

          <p className="ac-rpm-hint">
            Personalizza il viso, capelli, corpo e vestiti — poi clicca <strong>Salva</strong> nel creatore per generare l'avatar.
          </p>
        </div>

        {/* Footer */}
        <div className="ac-footer">
          <button className="ac-remove-btn" onClick={onRemove}>
            🗑 Rimuovi avatar
          </button>
          <div className="ac-footer-right">
            <button className="ac-cancel-btn" onClick={onClose}>Annulla</button>
            <button
              className="ac-save-btn"
              onClick={handleSave}
              disabled={saving || !avatarUrl}
            >
              {saving ? 'Salvataggio...' : '✓ Salva avatar'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AvatarCreator;
