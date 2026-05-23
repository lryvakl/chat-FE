import clsx from 'clsx';
import {
  Pencil,
  LogOut,
  RefreshCw,
  BellOff,
  Pin,
  User,
  Check,
  CheckCheck,
  Search,
  Sliders,
  Users as UsersIcon,
  MessageCircle,
  Inbox,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { AppearanceModal } from './AppearanceModal';
import { Avatar } from './Avatar';
import { ProfileModal } from './ProfileModal';
import { keysApi } from '../api/keysApi';
import { wipeLocalCrypto } from '../crypto/nuke';
import type { RootState } from '../store';
import { PresenceStatus } from '../types/enums';
import { ConversationType } from '../types/enums';
import type { Conversation } from '../types/interfaces';
import { describeConversation } from '../utils/conversationDisplay';

interface ConversationListProps {
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onLogout: () => void;
}

type Filter = 'all' | 'unread' | 'groups' | 'direct';

const formatTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ConversationList = ({
  onSelect,
  onNewChat,
  onLogout,
}: ConversationListProps) => {
  const { t } = useTranslation();
  const order = useSelector((s: RootState) => s.conversations.order);
  const byId = useSelector((s: RootState) => s.conversations.byId);
  const currentId = useSelector((s: RootState) => s.conversations.currentId);
  const currentUser = useSelector((s: RootState) => s.auth.user);
  const presence = useSelector((s: RootState) => s.presence.byUserId);
  const readByConversation = useSelector(
    (s: RootState) => s.presence.readByConversation,
  );
  const isLoading = useSelector((s: RootState) => s.conversations.isLoading);

  const [profileOpen, setProfileOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => {
    const list = order.map((id) => byId[id]).filter(Boolean) as Conversation[];
    const q = query.trim().toLowerCase();
    return [...list]
      .filter((c) => {
        const display = describeConversation(c, currentUser?.id ?? null);
        if (q && !display.title.toLowerCase().includes(q)) return false;
        if (filter === 'unread') {
          const unread =
            (c.lastMessage?.id ?? 0) > (c.lastReadMessageId ?? 0) &&
            c.lastMessage?.senderId !== (currentUser?.id ?? -1);
          if (!unread) return false;
        }
        if (filter === 'groups' && c.type !== ConversationType.Group)
          return false;
        if (filter === 'direct' && c.type !== ConversationType.Dm) return false;
        return true;
      })
      .sort((a, b) => {
        const pinDiff = Number(b.isPinned ?? false) - Number(a.isPinned ?? false);
        if (pinDiff !== 0) return pinDiff;
        return order.indexOf(a.id) - order.indexOf(b.id);
      });
  }, [order, byId, query, filter, currentUser?.id]);

  const totalUnread = useMemo(() => {
    let n = 0;
    for (const id of order) {
      const c = byId[id];
      if (!c) continue;
      const unread =
        (c.lastMessage?.id ?? 0) > (c.lastReadMessageId ?? 0) &&
        c.lastMessage?.senderId !== (currentUser?.id ?? -1) &&
        !c.isMuted;
      if (unread) n += 1;
    }
    return n;
  }, [order, byId, currentUser?.id]);

  const handleResetCrypto = async () => {
    const confirmed = window.confirm(t('conversations.resetCryptoConfirm'));
    if (!confirmed) return;
    try {
      await keysApi.reset();
    } catch (err) {
      console.warn('Server reset failed (continuing with local wipe):', err);
    }
    await wipeLocalCrypto();
    onLogout();
  };

  return (
    <aside className="conv-sidebar">
      <div className="conv-sidebar-header">
        <button
          className="conv-sidebar-brand conv-sidebar-brand-btn"
          onClick={() => setProfileOpen(true)}
          title={t('conversations.editProfile')}
        >
          <Avatar
            seed={currentUser?.displayName || currentUser?.username || '?'}
            size={38}
            avatarUrl={currentUser?.avatarUrl ?? null}
          />
          <div>
            <p className="conv-brand-title">
              {currentUser?.displayName || currentUser?.username}
            </p>
            <p className="conv-brand-sub">
              {currentUser?.customStatus || t('conversations.editProfile')}
            </p>
          </div>
        </button>
        <div className="conv-header-actions">
          <button
            className="icon-btn"
            onClick={() => setAppearanceOpen(true)}
            title={t('conversations.appearance')}
            aria-label={t('conversations.appearanceShort')}
          >
            <Sliders size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={onNewChat}
            title={t('conversations.newChatTooltip')}
            aria-label={t('conversations.newChatTooltip')}
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setProfileOpen(true)}
            title={t('conversations.myProfile')}
            aria-label={t('conversations.myProfile')}
          >
            <User size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={handleResetCrypto}
            title={t('conversations.resetKeys')}
            aria-label={t('conversations.resetKeys')}
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={onLogout}
            title={t('conversations.logout')}
            aria-label={t('conversations.logout')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="conv-search-wrap">
        <Search size={14} className="conv-search-icon" />
        <input
          className="conv-search"
          placeholder={t('conversations.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="conv-search-clear"
            onClick={() => setQuery('')}
            aria-label={t('conversations.clearSearch')}
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="conv-filters">
        <button
          className={clsx('conv-filter', filter === 'all' && 'active')}
          onClick={() => setFilter('all')}
        >
          <Inbox size={12} /> {t('conversations.filterAll')}
        </button>
        <button
          className={clsx('conv-filter', filter === 'unread' && 'active')}
          onClick={() => setFilter('unread')}
        >
          {t('conversations.filterUnread')}
          {totalUnread > 0 && (
            <span className="conv-filter-badge">{totalUnread}</span>
          )}
        </button>
        <button
          className={clsx('conv-filter', filter === 'direct' && 'active')}
          onClick={() => setFilter('direct')}
        >
          <MessageCircle size={12} /> {t('conversations.filterDirect')}
        </button>
        <button
          className={clsx('conv-filter', filter === 'groups' && 'active')}
          onClick={() => setFilter('groups')}
        >
          <UsersIcon size={12} /> {t('conversations.filterGroups')}
        </button>
      </div>

      <div className="conv-list-scroll">
        {isLoading && items.length === 0 && (
          <p className="conv-empty">{t('conversations.loadingDots')}</p>
        )}
        {!isLoading && items.length === 0 && (
          <div className="conv-empty">
            <p style={{ fontWeight: 600, marginBottom: 6 }}>
              {query
                ? t('conversations.noMatches')
                : t('conversations.noChatsYet')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {query
                ? t('conversations.tryDifferentSearch')
                : t('conversations.startConversationHint')}
            </p>
          </div>
        )}
        {items.map((conv) => {
          const display = describeConversation(conv, currentUser?.id ?? null, t);
          const peerOnline =
            display.peerUserId !== null &&
            presence[display.peerUserId]?.status === PresenceStatus.Online;
          const unread =
            (conv.lastMessage?.id ?? 0) > (conv.lastReadMessageId ?? 0) &&
            conv.lastMessage?.senderId !== (currentUser?.id ?? -1);

          const isMyLastMessage =
            conv.lastMessage !== null &&
            conv.lastMessage.senderId === (currentUser?.id ?? -1);
          const totalRecipients = Math.max(0, conv.members.length - 1);
          const convReadMap = readByConversation[conv.id] ?? {};
          const readersCount = isMyLastMessage
            ? Object.entries(convReadMap).filter(
                ([uidStr, lastId]) =>
                  Number(uidStr) !== (currentUser?.id ?? -1) &&
                  lastId >= (conv.lastMessage?.id ?? 0),
              ).length
            : 0;
          const allRead =
            isMyLastMessage &&
            readersCount >= totalRecipients &&
            totalRecipients > 0;
          const someRead = isMyLastMessage && readersCount > 0 && !allRead;

          return (
            <button
              key={conv.id}
              className={clsx(
                'conv-list-item',
                currentId === conv.id && 'active',
                unread && 'has-unread',
              )}
              onClick={() => onSelect(conv.id)}
            >
              <Avatar
                seed={display.avatarSeed}
                avatarUrl={display.avatarUrl}
                isGroup={conv.type === ConversationType.Group}
                showPresence={conv.type === ConversationType.Dm}
                isOnline={peerOnline}
                size={46}
              />
              <div className="conv-list-body">
                <div className="conv-list-row">
                  <span className="conv-list-title">
                    {conv.isPinned && (
                      <Pin
                        size={11}
                        style={{ opacity: 0.55, marginRight: 4 }}
                      />
                    )}
                    {display.title}
                  </span>
                  <span className="conv-list-time">
                    {formatTime(conv.lastMessage?.createdAt)}
                  </span>
                </div>
                <div className="conv-list-row">
                  <span className="conv-list-preview">
                    {conv.lastMessage?.text ?? t('chat.noMessagesYet')}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      gap: 4,
                      alignItems: 'center',
                    }}
                  >
                    {conv.isMuted && (
                      <BellOff size={12} style={{ opacity: 0.6 }} />
                    )}
                    {isMyLastMessage &&
                      !unread &&
                      (allRead ? (
                        <CheckCheck size={13} className="msg-read read" />
                      ) : someRead ? (
                        <CheckCheck size={13} className="msg-read" />
                      ) : (
                        <Check size={13} className="msg-read" />
                      ))}
                    {unread &&
                      !conv.isMuted &&
                      ((conv.unreadCount ?? 0) > 0 ? (
                        <span className="conv-list-unread-badge">
                          {conv.unreadCount}
                        </span>
                      ) : (
                        <span className="conv-list-unread-dot" />
                      ))}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      {appearanceOpen && (
        <AppearanceModal onClose={() => setAppearanceOpen(false)} />
      )}
    </aside>
  );
};
