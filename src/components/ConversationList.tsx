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
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

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

const formatTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ConversationList = ({
  onSelect,
  onNewChat,
  onLogout,
}: ConversationListProps) => {
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

  const items = useMemo(() => {
    const list = order.map((id) => byId[id]).filter(Boolean) as Conversation[];
    return [...list].sort((a, b) => {
      const pinDiff = Number(b.isPinned ?? false) - Number(a.isPinned ?? false);
      if (pinDiff !== 0) return pinDiff;
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      return ai - bi;
    });
  }, [order, byId]);

  const handleResetCrypto = async () => {
    const confirmed = window.confirm(
      'Reset encryption keys?\n\n' +
        'This wipes the local key vault and server-side identity, then logs you out.\n' +
        'Old encrypted messages will no longer be readable, but you can chat freely after re-login.',
    );
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
          title="Edit profile"
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
              {currentUser?.customStatus || 'Edit profile'}
            </p>
          </div>
        </button>
        <div className="conv-header-actions">
          <button
            className="icon-btn"
            onClick={() => setProfileOpen(true)}
            title="My profile"
            aria-label="My profile"
          >
            <User size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={onNewChat}
            title="New chat"
            aria-label="New chat"
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={handleResetCrypto}
            title="Reset encryption keys"
            aria-label="Reset encryption keys"
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={onLogout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="conv-list-scroll">
        {isLoading && items.length === 0 && (
          <p className="conv-empty">Loading…</p>
        )}
        {!isLoading && items.length === 0 && (
          <div className="conv-empty">
            <p style={{ fontWeight: 600, marginBottom: 6 }}>No chats yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Start a conversation by tapping the pencil icon above.
            </p>
          </div>
        )}
        {items.map((conv) => {
          const display = describeConversation(conv, currentUser?.id ?? null);
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
              )}
              onClick={() => onSelect(conv.id)}
            >
              <Avatar
                seed={display.avatarSeed}
                avatarUrl={display.avatarUrl}
                isGroup={conv.type === ConversationType.Group}
                showPresence={conv.type === ConversationType.Dm}
                isOnline={peerOnline}
                accentColor={display.peerAccentColor}
                size={46}
              />
              <div className="conv-list-body">
                <div className="conv-list-row">
                  <span className="conv-list-title">{display.title}</span>
                  <span className="conv-list-time">
                    {formatTime(conv.lastMessage?.createdAt)}
                  </span>
                </div>
                <div className="conv-list-row">
                  <span className="conv-list-preview">
                    {conv.lastMessage?.text ?? 'No messages yet'}
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
                    {conv.isPinned && (
                      <Pin size={12} style={{ opacity: 0.7 }} />
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
    </aside>
  );
};
