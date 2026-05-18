import { Camera, Check, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';

import { Avatar } from './Avatar';
import { usersApi, type UpdateProfilePayload } from '../api/usersApi';
import type { AppDispatch, RootState } from '../store';
import { profileUpdated } from '../store/authSlice';

interface ProfileModalProps {
  onClose: () => void;
}

const STATUS_PRESETS = [
  '🟢 Available',
  '📚 Studying',
  '💼 Working',
  '🌙 Do not disturb',
  '✈️ Traveling',
  '🎮 Gaming',
];

const ACCENT_PRESETS = [
  '#7c5cff',
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#06b6d4',
  '#0f172a',
];

export const ProfileModal = ({ onClose }: ProfileModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const me = useSelector((s: RootState) => s.auth.user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(me?.displayName ?? '');
  const [bio, setBio] = useState(me?.bio ?? '');
  const [customStatus, setCustomStatus] = useState(me?.customStatus ?? '');
  const [accentColor, setAccentColor] = useState(me?.accentColor ?? '#7c5cff');
  const [showLastSeen, setShowLastSeen] = useState(me?.showLastSeen ?? true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    me?.avatarUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fresh = await usersApi.me();
        if (cancelled) return;
        setDisplayName(fresh.displayName ?? '');
        setBio(fresh.bio ?? '');
        setCustomStatus(fresh.customStatus ?? '');
        setAccentColor(fresh.accentColor ?? '#7c5cff');
        setShowLastSeen(fresh.showLastSeen ?? true);
        setAvatarUrl(fresh.avatarUrl ?? null);
        dispatch(profileUpdated(fresh));
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const handleAvatar = async (file: File) => {
    if (file.size > 256 * 1024) {
      alert('Pick an image smaller than 256 KB.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setAvatarUrl(dataUrl);
    } catch (err) {
      console.error('Avatar read failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: UpdateProfilePayload = {
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        customStatus: customStatus.trim() || null,
        accentColor: accentColor || null,
        showLastSeen,
        avatarUrl,
      };
      const updated = await usersApi.updateMe(payload);
      dispatch(profileUpdated(updated));
      onClose();
    } catch (err) {
      console.error('Profile save failed:', err);
      alert('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const avatarSeed = displayName || me?.username || '?';

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>Edit profile</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-scroll">
          <div className="profile-hero">
            <button
              type="button"
              className="profile-avatar-edit"
              onClick={() => fileRef.current?.click()}
              style={{ borderColor: accentColor }}
            >
              <div className="profile-avatar-inner">
                <Avatar
                  seed={avatarSeed}
                  size={92}
                  avatarUrl={avatarUrl ?? null}
                />
              </div>
              <span
                className="profile-avatar-cam"
                style={{ background: accentColor }}
              >
                <Camera size={16} />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void handleAvatar(f);
              }}
            />
            <p className="profile-username">@{me?.username}</p>
            {uploading && <p className="profile-hint">Reading file…</p>}
          </div>

          <div className="settings-section-title">Display name</div>
          <input
            className="modal-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            placeholder="How you appear to others"
          />

          <div className="settings-section-title">Bio</div>
          <textarea
            className="modal-input modal-textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="A short description"
          />
          <div className="modal-hint-row">
            <span>{bio.length}/280</span>
          </div>

          <div className="settings-section-title">Status</div>
          <input
            className="modal-input"
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            maxLength={120}
            placeholder="e.g. 📚 Working on coursework"
          />
          <div className="status-presets">
            {STATUS_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                className={`status-preset ${
                  customStatus === s ? 'active' : ''
                }`}
                onClick={() => setCustomStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="settings-section-title">Accent color</div>
          <div className="accent-row">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={`accent-dot ${accentColor === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setAccentColor(c)}
                aria-label={c}
              />
            ))}
            <label className="accent-custom">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
              />
              <span style={{ background: accentColor }} />
            </label>
          </div>

          <button
            type="button"
            className={`settings-row ${showLastSeen ? 'active' : ''}`}
            onClick={() => setShowLastSeen((v) => !v)}
            style={{ marginTop: 12 }}
          >
            <span className="settings-row-label">Show last seen to others</span>
            <span
              className={`settings-toggle ${showLastSeen ? 'on' : ''}`}
              aria-hidden="true"
            />
          </button>
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
            <Check size={16} /> Save profile
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
