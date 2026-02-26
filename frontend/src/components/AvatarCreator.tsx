import React, { useEffect, useState } from 'react';
import './AvatarCreator.css';

interface AvatarCreatorProps {
  initialConfig?: string | null;
  onSave: (url: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

// Ready Player Me demo iframe URL — works without registration
const RPM_IFRAME_URL = 'https://demo.readyplayer.me/avatar?frameApi&clearCache';

const AvatarCreator: React.FC<AvatarCreatorProps> = ({ onSave, onRemove, onClose }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // v2 JSON format: { source: 'readyplayerme', eventName: 'v1.avatar.exported', data: { url } }
      if (event.data?.source === 'readyplayerme' && event.data?.eventName === 'v1.avatar.exported') {
        const glbUrl: string = event.data?.data?.url || '';
        if (glbUrl) setAvatarUrl(glbUrl.replace('.glb', '.png'));
        return;
      }
      // Legacy string format: just the URL
      if (typeof event.data === 'string' && event.data.includes('models.readyplayer.me')) {
        setAvatarUrl(event.data.replace('.glb', '.png'));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleSave = async () => {
    if (!avatarUrl) return;
    setSaving(true);
    try {
      await onSave(avatarUrl);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ac-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ac-modal ac-modal--rpm">

        <div className="ac-header">
          <span className="ac-title">Create your avatar</span>
          <button className="ac-close" onClick={onClose}>×</button>
        </div>

        {!avatarUrl ? (
          <div className="rpm-iframe-wrap">
            {!iframeLoaded && (
              <div className="rpm-loading">
                <span className="rpm-loading-spinner" />
                Loading avatar creator...
              </div>
            )}
            <iframe
              src={RPM_IFRAME_URL}
              title="Avatar Creator"
              allow="camera *; microphone *"
              className={`rpm-iframe${iframeLoaded ? ' rpm-iframe--visible' : ''}`}
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
        ) : (
          <div className="rpm-preview">
            <img
              src={`${avatarUrl}?scene=halfbody-portrait-v1-transparent&background=f5f0eb`}
              alt="Your avatar"
              className="rpm-preview-img"
              onError={e => { (e.currentTarget as HTMLImageElement).src = avatarUrl; }}
            />
            <p className="rpm-preview-hint">Looking good! Save your avatar or go back to customise more.</p>
            <div className="rpm-preview-btns">
              <button className="ac-cancel-btn" onClick={() => setAvatarUrl(null)}>Customise more</button>
              <button className="ac-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save avatar'}
              </button>
            </div>
          </div>
        )}

        <div className="ac-footer">
          <button className="ac-remove-btn" onClick={onRemove}>Remove avatar</button>
          <button className="ac-cancel-btn" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>
  );
};

export default AvatarCreator;
