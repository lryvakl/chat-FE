import clsx from 'clsx';
import {
  Check,
  CheckCheck,
  CornerUpLeft,
  Pencil,
  Smile,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from './Avatar';
import { stringToColor } from '../theme';
import { MediaBubble } from './MediaBubble';
import { ConversationType } from '../types/enums';
import type { ConversationMemberSummary, Message } from '../types/interfaces';
import {
  formatTime,
  isSameDay,
  formatDateSeparator,
} from '../utils/dateFormatters';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '🙏'];

interface MessageListProps {
  messages: Message[];
  currentUserId: number | null;
  conversationType: ConversationType;
  members: ConversationMemberSummary[];
  membersReadByMessageId: Record<number, number[]>;
  totalRecipients: number;
  onDelete: (id: number) => void;
  onEdit: (msg: Message) => void;
  onReply?: (msg: Message) => void;
  onToggleReaction?: (msg: Message, emoji: string) => void;
  onVisibleLast?: (lastMessageId: number) => void;
}

export const MessageList = ({
  messages,
  currentUserId,
  conversationType,
  members,
  membersReadByMessageId,
  totalRecipients,
  onDelete,
  onEdit,
  onReply,
  onToggleReaction,
  onVisibleLast,
}: MessageListProps) => {
  const avatarByUserId = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const m of members) map.set(m.userId, m.avatarUrl ?? null);
    return map;
  }, [members]);
  const accentByUserId = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const m of members) map.set(m.userId, m.accentColor ?? null);
    return map;
  }, [members]);
  const endRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const [pickerForId, setPickerForId] = useState<number | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    const last = messages[messages.length - 1];
    if (last && onVisibleLast) onVisibleLast(last.id);
  }, [messages, onVisibleLast]);

  const items = useMemo(() => messages, [messages]);

  const renderActions = (msg: Message, isMe: boolean) => (
    <div className="msg-actions">
      <button
        className="icon-btn"
        onClick={() =>
          setPickerForId((cur) => (cur === msg.id ? null : msg.id))
        }
        aria-label="React"
        title="React"
      >
        <Smile size={14} />
      </button>
      {onReply && (
        <button
          className="icon-btn"
          onClick={() => onReply(msg)}
          aria-label="Reply"
          title="Reply"
        >
          <CornerUpLeft size={14} />
        </button>
      )}
      {isMe && (
        <>
          <button
            className="icon-btn"
            onClick={() => onEdit(msg)}
            aria-label="Edit"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            className="icon-btn danger"
            onClick={() => onDelete(msg.id)}
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="msg-thread">
      {items.map((msg, index) => {
        const isMe = msg.senderId === currentUserId;
        const prev = items[index - 1];
        const senderName = msg.senderUsername ?? 'Unknown';
        const senderAccent =
          msg.senderId !== null
            ? (accentByUserId.get(msg.senderId) ?? null)
            : null;
        const senderColor = senderAccent ?? stringToColor(senderName);

        const showDate = !prev || !isSameDay(msg.createdAt, prev.createdAt);
        const showAvatar =
          !isMe && (!prev || prev.senderId !== msg.senderId || showDate);
        const isGroup = conversationType === ConversationType.Group;

        const readers = membersReadByMessageId[msg.id] ?? [];
        const allRead =
          isMe && readers.length >= totalRecipients && totalRecipients > 0;
        const someRead = isMe && readers.length > 0 && !allRead;

        const bubble = (
          <div
            className={clsx(
              'msg-bubble',
              isMe ? 'me' : 'them',
              msg.media &&
                !msg.text &&
                (msg.media.mime.startsWith('image/')
                  ? 'image-only'
                  : msg.media.mime.startsWith('audio/')
                    ? 'voice-only'
                    : 'file-only'),
            )}
          >
            {!isMe && isGroup && showAvatar && (
              <p
                style={{
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  marginBottom: '0.25rem',
                  color: senderColor,
                }}
              >
                {senderName}
              </p>
            )}
            {msg.replyTo && (
              <div className="msg-reply-quote">
                <span className="msg-reply-quote-name">
                  {msg.replyTo.senderUsername ?? 'Unknown'}
                </span>
                <span className="msg-reply-quote-text">
                  {msg.replyTo.isEncrypted && !msg.replyTo.text
                    ? '[encrypted message]'
                    : msg.replyTo.text || '[media]'}
                </span>
              </div>
            )}
            {msg.media && <MediaBubble media={msg.media} />}
            {msg.text && (
              <p
                style={{
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginTop: msg.media ? '0.4rem' : 0,
                }}
              >
                {msg.text}
              </p>
            )}
            <div className="msg-meta">
              {msg.editedAt && <span className="msg-edited">edited</span>}
              <span className="msg-time">{formatTime(msg.createdAt)}</span>
              {isMe &&
                (allRead ? (
                  <CheckCheck size={14} className="msg-read read" />
                ) : someRead ? (
                  <CheckCheck size={14} className="msg-read" />
                ) : (
                  <Check size={14} className="msg-read" />
                ))}
            </div>

            {msg.reactions && msg.reactions.length > 0 && (
              <div className="msg-reactions">
                {msg.reactions.map((r) => {
                  const mine =
                    currentUserId !== null && r.userIds.includes(currentUserId);
                  return (
                    <button
                      key={r.emoji}
                      type="button"
                      className={clsx('msg-reaction-chip', mine && 'mine')}
                      onClick={() => onToggleReaction?.(msg, r.emoji)}
                      title={mine ? 'Remove reaction' : 'Add reaction'}
                    >
                      <span>{r.emoji}</span>
                      <span className="msg-reaction-count">{r.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {pickerForId === msg.id && (
              <div
                className="msg-reaction-picker"
                onMouseLeave={() => setPickerForId(null)}
              >
                {QUICK_REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="msg-reaction-quick"
                    onClick={() => {
                      onToggleReaction?.(msg, e);
                      setPickerForId(null);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

        return (
          <div key={msg.id} className="message-enter-anim">
            {showDate && (
              <div className="date-divider">
                <span className="date-chip">
                  {formatDateSeparator(msg.createdAt, t, i18n.language)}
                </span>
              </div>
            )}
            <div className={clsx('msg-row', isMe ? 'me' : 'them')}>
              {!isMe && (
                <div style={{ width: 36, flexShrink: 0 }}>
                  {showAvatar && (
                    <Avatar
                      seed={senderName}
                      avatarUrl={
                        msg.senderId !== null
                          ? (avatarByUserId.get(msg.senderId) ?? null)
                          : null
                      }
                      accentColor={senderAccent}
                      size={36}
                    />
                  )}
                </div>
              )}

              {isMe ? (
                <>
                  {renderActions(msg, true)}
                  {bubble}
                </>
              ) : (
                <>
                  {bubble}
                  {renderActions(msg, false)}
                </>
              )}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

export default MessageList;
