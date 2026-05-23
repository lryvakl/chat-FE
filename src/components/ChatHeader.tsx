import { BellOff, Info, Menu, Palette, Pin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { Avatar } from './Avatar';
import type { RootState } from '../store';
import { ChatSettingsModal } from './ChatSettingsModal';
import { ConversationType, PresenceStatus } from '../types/enums';
import type { Conversation } from '../types/interfaces';
import {
  describeConversation,
  formatLastSeen,
} from '../utils/conversationDisplay';

interface ChatHeaderProps {
  conversation: Conversation;
  onOpenInfo: () => void;
  onOpenMenu?: () => void;
}

export const ChatHeader = ({
  conversation,
  onOpenInfo,
  onOpenMenu,
}: ChatHeaderProps) => {
  const { t } = useTranslation();
  const myId = useSelector((s: RootState) => s.auth.user?.id);
  const presence = useSelector((s: RootState) => s.presence.byUserId);
  const typingMap = useSelector(
    (s: RootState) => s.presence.typingByConversation[conversation.id],
  );

  const [settingsOpen, setSettingsOpen] = useState(false);

  const display = useMemo(
    () => describeConversation(conversation, myId ?? null, t),
    [conversation, myId, t],
  );

  const peer = useMemo(() => {
    if (conversation.type !== ConversationType.Dm) return null;
    return conversation.members.find((m) => m.userId !== myId) ?? null;
  }, [conversation, myId]);

  const peerStatus = peer?.customStatus ?? null;

  const typingUsernames = useMemo(() => {
    if (!typingMap) return [] as string[];
    const now = Date.now();
    return Object.entries(typingMap)
      .filter(([uid, info]) => Number(uid) !== myId && info.expiresAt > now)
      .map(([, info]) => info.username || t('common.someone'));
  }, [typingMap, myId, t]);

  const subtitle = useMemo(() => {
    if (typingUsernames.length > 0) {
      return typingUsernames.length === 1
        ? t('chat.isTyping', { name: typingUsernames[0] })
        : t('chat.peopleTyping', { count: typingUsernames.length });
    }
    if (conversation.type === ConversationType.Dm) {
      if (peerStatus) return peerStatus;
      if (!peer) return '';
      const p = presence[peer.userId];
      if (p?.status === PresenceStatus.Online) return t('common.online');
      return formatLastSeen(p?.lastSeenAt ?? null, t);
    }
    return t('members.memberCount', { count: conversation.members.length });
  }, [typingUsernames, conversation, peer, peerStatus, presence, t]);

  const peerOnline = useMemo(() => {
    if (conversation.type !== ConversationType.Dm) return false;
    return peer
      ? presence[peer.userId]?.status === PresenceStatus.Online
      : false;
  }, [conversation, peer, presence]);

  return (
    <div className="chat-header">
      {onOpenMenu && (
        <button
          className="icon-btn chat-header-menu"
          onClick={onOpenMenu}
          aria-label={t('chat.openMenu')}
        >
          <Menu size={18} />
        </button>
      )}
      <button className="chat-header-info-btn" onClick={onOpenInfo}>
        {conversation.type === ConversationType.Dm && peer?.avatarUrl ? (
          <img
            src={peer.avatarUrl}
            alt={display.title}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Avatar
            seed={display.avatarSeed}
            isGroup={conversation.type === ConversationType.Group}
            showPresence={conversation.type === ConversationType.Dm}
            isOnline={peerOnline}
            accentColor={peer?.accentColor ?? null}
            size={40}
          />
        )}
        <div className="chat-header-text">
          <p className="chat-header-title">
            {display.title}
            {conversation.isPinned && (
              <Pin size={12} style={{ marginLeft: 6, opacity: 0.6 }} />
            )}
            {conversation.isMuted && (
              <BellOff size={12} style={{ marginLeft: 4, opacity: 0.6 }} />
            )}
          </p>
          <p className="chat-header-sub">{subtitle}</p>
        </div>
      </button>
      <button
        className="icon-btn"
        onClick={() => setSettingsOpen(true)}
        aria-label={t('chat.chatCustomization')}
        title={t('chat.themeMutePin')}
      >
        <Palette size={18} />
      </button>
      <button
        className="icon-btn"
        onClick={onOpenInfo}
        aria-label={t('chat.conversationInfo')}
      >
        <Info size={18} />
      </button>

      {settingsOpen && (
        <ChatSettingsModal
          conversation={conversation}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
};
