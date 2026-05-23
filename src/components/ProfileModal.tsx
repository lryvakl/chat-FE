import { Camera, Check, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { Avatar } from './Avatar';
import { usersApi, type UpdateProfilePayload } from '../api/usersApi';
import type { AppDispatch, RootState } from '../store';
import { profileUpdated } from '../store/authSlice';

interface ProfileModalProps {
  onClose: () => void;
}

const STATUS_PRESET_KEYS = [
  'profile.presetAvailable',
  'profile.presetStudying',
  'profile.presetWorking',
  'profile.presetDnd',
  'profile.presetTraveling',
  'profile.presetGaming',
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
  const { t } = useTranslation();

  const [username, setUsername] = useState(me?.username ?? '');
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
        setUsername(fresh.username ?? '');
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
      alert(t('errors.avatarTooLarge'));
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
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 2) {
      alert(t('errors.usernameTooShort'));
      return;
    }
    if (trimmedUsername.length > 30) {
      alert(t('errors.usernameTooLong'));
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateProfilePayload = {
        username: trimmedUsername,
        bio: bio.trim() || null,
        customStatus: customStatus.trim() || null,
        accentColor: accentColor || null,
        showLastSeen,
        avatarUrl,
      };
      const updated = await usersApi.updateMe(payload);
      dispatch(profileUpdated(updated));
      onClose();
    } catch (err: unknown) {
      console.error('Profile save failed:', err);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? t('errors.profileSaveFailed');
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const avatarSeed = username || me?.username || '?';

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{t('profile.title')}</h3>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label={t('common.close')}
          >
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
            <p className="profile-username">@{username || me?.username}</p>
            {uploading && <p className="profile-hint">{t('profile.readingFile')}</p>}
          </div>

          <div className="settings-section-title">{t('profile.username')}</div>
          <input
            className="modal-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={30}
            placeholder={t('profile.usernamePlaceholder')}
          />

          <div className="settings-section-title">{t('profile.bio')}</div>
          <textarea
            className="modal-input modal-textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder={t('profile.bioPlaceholder')}
          />
          <div className="modal-hint-row">
            <span>{bio.length}/280</span>
          </div>

          <div className="settings-section-title">{t('profile.status')}</div>
          <input
            className="modal-input"
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            maxLength={120}
            placeholder={t('profile.statusPlaceholder')}
          />
          <div className="status-presets">
            {STATUS_PRESET_KEYS.map((key) => {
              const label = t(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`status-preset ${
                    customStatus === label ? 'active' : ''
                  }`}
                  onClick={() => setCustomStatus(label)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="settings-section-title">{t('profile.accent')}</div>
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
            <span className="settings-row-label">{t('profile.showLastSeen')}</span>
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
            {t('common.cancel')}
          </button>
          <button
            className="primary-btn"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            <Check size={16} /> {t('profile.saveProfile')}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
