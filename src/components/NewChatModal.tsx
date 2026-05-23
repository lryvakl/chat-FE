import clsx from 'clsx';
import { Search, Users, User as UserIcon, X, Check } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { Avatar } from './Avatar';
import { usersApi } from '../api/usersApi';
import type { AppDispatch, RootState } from '../store';
import { createGroup, openDm } from '../store/thunks/conversations';
import type { User } from '../types/interfaces';

type Tab = 'dm' | 'group';

interface NewChatModalProps {
  onClose: () => void;
}

export const NewChatModal = ({ onClose }: NewChatModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const me = useSelector((s: RootState) => s.auth.user);
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>('dm');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<Record<number, User>>({});
  const [groupName, setGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const users = await usersApi.search(query);
        setResults(users);
      } catch (err) {
        console.error(err);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const selectedList = useMemo(() => Object.values(selected), [selected]);

  const handlePickDm = async (user: User) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await dispatch(openDm(user.id)).unwrap();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGroupSelect = (user: User) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[user.id]) delete next[user.id];
      else next[user.id] = user;
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (submitting) return;
    if (!groupName.trim()) return;
    if (selectedList.length === 0) return;
    setSubmitting(true);
    try {
      await dispatch(
        createGroup({
          name: groupName.trim(),
          memberIds: selectedList.map((u) => u.id),
        }),
      ).unwrap();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal-header">
          <h3>{t('newChat.title')}</h3>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="modal-tabs">
          <button
            className={clsx('modal-tab', tab === 'dm' && 'active')}
            onClick={() => setTab('dm')}
          >
            <UserIcon size={15} /> {t('newChat.tabDirect')}
          </button>
          <button
            className={clsx('modal-tab', tab === 'group' && 'active')}
            onClick={() => setTab('group')}
          >
            <Users size={15} /> {t('newChat.tabGroup')}
          </button>
        </div>

        {tab === 'group' && (
          <input
            className="modal-input"
            placeholder={t('newChat.groupNamePlaceholder')}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            maxLength={120}
          />
        )}

        <div className="modal-search">
          <Search size={16} className="modal-search-icon" />
          <input
            ref={inputRef}
            className="modal-input modal-input-search"
            placeholder={t('newChat.searchUsersPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {tab === 'group' && selectedList.length > 0 && (
          <div className="modal-chips">
            {selectedList.map((u) => (
              <span key={u.id} className="modal-chip">
                {u.username}
                <button
                  className="modal-chip-x"
                  onClick={() => toggleGroupSelect(u)}
                  aria-label={t('newChat.removeUser', { name: u.username })}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="modal-results">
          {results.length === 0 && query.trim() && (
            <p className="modal-empty">{t('newChat.noUsersFound')}</p>
          )}
          {results.length === 0 && !query.trim() && (
            <p className="modal-empty">{t('newChat.startTyping')}</p>
          )}
          {results
            .filter((u) => u.id !== me?.id)
            .map((u) => {
              const isPicked = Boolean(selected[u.id]);
              return (
                <button
                  key={u.id}
                  className={clsx(
                    'modal-result',
                    tab === 'group' && isPicked && 'picked',
                  )}
                  onClick={() => {
                    if (tab === 'dm') void handlePickDm(u);
                    else toggleGroupSelect(u);
                  }}
                >
                  <Avatar seed={u.username} size={36} />
                  <span className="modal-result-name">{u.username}</span>
                  {tab === 'group' && isPicked && (
                    <Check size={16} className="modal-result-check" />
                  )}
                </button>
              );
            })}
        </div>

        {tab === 'group' && (
          <footer className="modal-footer">
            <button
              className="primary-btn"
              disabled={
                submitting || !groupName.trim() || selectedList.length === 0
              }
              onClick={handleCreateGroup}
            >
              {t('newChat.createGroup', { count: selectedList.length })}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
