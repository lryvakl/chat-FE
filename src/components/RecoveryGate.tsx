import { AlertTriangle, Download, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { importVaultBlob } from '../crypto/keyStore';
import {
  finishFreshReset,
  finishRestoreFromBackup,
} from '../crypto/provisioning';
import type { AppDispatch, RootState } from '../store';
import { logout, recoveryResolved } from '../store/authSlice';

type Tab = 'restore' | 'reset';

export const RecoveryGate = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const me = useSelector((s: RootState) => s.auth.user);
  const token = useSelector((s: RootState) => s.auth.token);

  const [tab, setTab] = useState<Tab>('restore');
  const [password, setPassword] = useState('');
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!me || !token) return null;

  const handleRestore = async () => {
    if (!backupFile) {
      setErr(t('recovery.errors.noFile'));
      return;
    }
    if (!password) {
      setErr(t('recovery.errors.noPassword'));
      return;
    }
    setWorking(true);
    setErr(null);
    try {
      const text = await backupFile.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(t('recovery.errors.badJson'));
      }
      await importVaultBlob(me.id, parsed);
      await finishRestoreFromBackup(me.id, password, token);
      dispatch(recoveryResolved());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setWorking(false);
    }
  };

  const handleReset = async () => {
    if (!password) {
      setErr(t('recovery.errors.noPassword'));
      return;
    }
    setWorking(true);
    setErr(null);
    try {
      await finishFreshReset(me.id, me.username, password, token);
      dispatch(recoveryResolved());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setWorking(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return createPortal(
    <div className="modal-overlay">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <header className="modal-header">
          <h3>{t('recovery.title')}</h3>
          <button
            className="icon-btn"
            onClick={handleLogout}
            aria-label={t('common.close')}
            title={t('recovery.logoutInstead')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="modal-scroll">
          <div
            className="alert-error"
            style={{
              marginBottom: '1rem',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{t('recovery.warning')}</span>
          </div>

          <div
            role="tablist"
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: '1rem',
            }}
          >
            <button
              role="tab"
              type="button"
              className={tab === 'restore' ? 'primary-btn' : 'ghost-btn'}
              onClick={() => {
                setTab('restore');
                setErr(null);
              }}
              style={{ flex: 1 }}
            >
              <Upload size={14} style={{ marginRight: 6 }} />
              {t('recovery.tabs.restore')}
            </button>
            <button
              role="tab"
              type="button"
              className={tab === 'reset' ? 'primary-btn' : 'ghost-btn'}
              onClick={() => {
                setTab('reset');
                setErr(null);
              }}
              style={{ flex: 1 }}
            >
              <Download
                size={14}
                style={{ marginRight: 6, transform: 'rotate(180deg)' }}
              />
              {t('recovery.tabs.reset')}
            </button>
          </div>

          {tab === 'restore' ? (
            <>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  marginBottom: '0.75rem',
                }}
              >
                {t('recovery.restoreHint')}
              </p>

              <div className="settings-section-title">
                {t('recovery.backupFile')}
              </div>
              <input
                type="file"
                accept="application/json,.json"
                className="modal-input"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setBackupFile(f);
                  setErr(null);
                }}
              />

              <div className="settings-section-title">
                {t('recovery.password')}
              </div>
              <input
                type="password"
                className="modal-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('recovery.passwordPlaceholder')}
              />
            </>
          ) : (
            <>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  marginBottom: '0.75rem',
                }}
              >
                {t('recovery.resetHint')}
              </p>

              <div className="settings-section-title">
                {t('recovery.password')}
              </div>
              <input
                type="password"
                className="modal-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('recovery.passwordPlaceholder')}
              />
            </>
          )}

          {err && (
            <div
              className="alert-error"
              style={{ marginTop: '0.75rem' }}
              role="alert"
            >
              {err}
            </div>
          )}
        </div>

        <footer className="modal-footer modal-footer-row">
          <button
            type="button"
            className="ghost-btn"
            onClick={handleLogout}
            disabled={working}
          >
            {t('recovery.logoutInstead')}
          </button>
          {tab === 'restore' ? (
            <button
              type="button"
              className="primary-btn"
              onClick={() => void handleRestore()}
              disabled={working || !backupFile || !password}
            >
              {working ? t('recovery.working') : t('recovery.tabs.restore')}
            </button>
          ) : (
            <button
              type="button"
              className="primary-btn"
              onClick={() => void handleReset()}
              disabled={working || !password}
            >
              {working ? t('recovery.working') : t('recovery.confirmReset')}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
};
