import { BellOff, Check, Pin, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';

import type { AppDispatch } from '../store';
import { updateMembership } from '../store/thunks/conversations';
import type { Conversation } from '../types/interfaces';

interface ChatSettingsModalProps {
  conversation: Conversation;
  onClose: () => void;
}

export const CHAT_THEMES: { id: string; label: string; gradient: string }[] = [
  {
    id: 'default',
    label: 'Default',
    gradient: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    gradient: 'linear-gradient(180deg, #ff9a8b 0%, #ff6a88 50%, #ff99ac 100%)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    gradient: 'linear-gradient(180deg, #2193b0 0%, #6dd5ed 100%)',
  },
  {
    id: 'forest',
    label: 'Forest',
    gradient: 'linear-gradient(180deg, #134e5e 0%, #71b280 100%)',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    gradient: 'linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  },
  {
    id: 'rose',
    label: 'Rose',
    gradient: 'linear-gradient(180deg, #f6d365 0%, #fda085 100%)',
  },
];

export const ChatSettingsModal = ({
  conversation,
  onClose,
}: ChatSettingsModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isMuted, setIsMuted] = useState(conversation.isMuted ?? false);
  const [isPinned, setIsPinned] = useState(conversation.isPinned ?? false);
  const [theme, setTheme] = useState<string>(conversation.theme ?? 'default');
  const [wallpaperUrl, setWallpaperUrl] = useState<string>(
    conversation.wallpaperUrl ?? '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await dispatch(
        updateMembership({
          conversationId: conversation.id,
          payload: {
            isMuted,
            isPinned,
            theme: theme === 'default' ? null : theme,
            wallpaperUrl: wallpaperUrl.trim() || null,
          },
        }),
      ).unwrap();
      onClose();
    } catch (err) {
      console.error('Chat settings save failed:', err);
      alert('Failed to save chat settings.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>Chat customization</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-scroll">
          <div className="settings-block">
            <button
              type="button"
              className={`settings-row ${isMuted ? 'active' : ''}`}
              onClick={() => setIsMuted((v) => !v)}
            >
              <span className="settings-row-label">
                <BellOff size={16} />
                Mute notifications
              </span>
              <span
                className={`settings-toggle ${isMuted ? 'on' : ''}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className={`settings-row ${isPinned ? 'active' : ''}`}
              onClick={() => setIsPinned((v) => !v)}
            >
              <span className="settings-row-label">
                <Pin size={16} />
                Pin to top
              </span>
              <span
                className={`settings-toggle ${isPinned ? 'on' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="settings-section-title">Theme</div>
          <div className="theme-grid">
            {CHAT_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-swatch ${theme === t.id ? 'active' : ''}`}
                onClick={() => setTheme(t.id)}
                style={{ background: t.gradient }}
                title={t.label}
              >
                {theme === t.id && (
                  <span className="theme-swatch-check">
                    <Check size={14} />
                  </span>
                )}
                <span className="theme-swatch-label">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="settings-section-title">Wallpaper URL</div>
          <input
            className="modal-input"
            value={wallpaperUrl}
            onChange={(e) => setWallpaperUrl(e.target.value)}
            placeholder="https://example.com/pattern.png"
          />
        </div>

        <footer className="modal-footer modal-footer-row">
          <button
            type="button"
            className="ghost-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="primary-btn"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            <Check size={16} /> Save changes
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
