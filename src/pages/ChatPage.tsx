import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import { usersApi } from '../api/usersApi';
import { ChatHeader } from '../components/ChatHeader';
import { CHAT_THEMES } from '../components/ChatSettingsModal';
import {
  getWallpaperBackground,
  usePreferences,
} from '../preferences/PreferencesContext';
import { ConversationList } from '../components/ConversationList';
import { MembersPanel } from '../components/MembersPanel';
import MessageInput from '../components/MessageInput';
import MessageList from '../components/MessageList';
import { NewChatModal } from '../components/NewChatModal';
import { TypingIndicator } from '../components/TypingIndicator';
import { Loader } from '../components/utils/Loader';
import type { MediaAttachment } from '../crypto/messageEnvelope';
import { useAccentColor } from '../hooks/useAccentColor';
import { useChat } from '../hooks/useChat';
import { useSocketLifecycle } from '../hooks/useSocketLifecycle';
import type { AppDispatch, RootState } from '../store';
import { profileUpdated } from '../store/authSlice';
import { logout } from '../store/authSlice';
import { setCurrent } from '../store/conversationsSlice';
import { fetchConversations } from '../store/thunks/conversations';
import { fetchHistory } from '../store/thunks/messages';
import { PATHS } from '../types/enums';
import type { Message } from '../types/interfaces';

const ChatPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const conversationId = id ? Number(id) : null;

  useSocketLifecycle();
  useAccentColor();
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const fresh = await usersApi.me();
        if (!cancelled) dispatch(profileUpdated(fresh));
      } catch (err) {
        console.warn('Profile hydration failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const me = useSelector((s: RootState) => s.auth.user);
  const conversation = useSelector((s: RootState) =>
    conversationId ? s.conversations.byId[conversationId] : null,
  );
  const typingMap = useSelector((s: RootState) =>
    conversationId
      ? s.presence.typingByConversation[conversationId]
      : undefined,
  );
  const readMap = useSelector((s: RootState) =>
    conversationId ? s.presence.readByConversation[conversationId] : undefined,
  );

  const [editing, setEditing] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [text, setText] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { prefs } = usePreferences();

  const onScrollMsgs = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJump(distance > 240);
  }, []);

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const {
    messages,
    isLoadingHistory,
    sendMessage,
    editMessage,
    deleteMessage,
    onLocalTyping,
    stopTyping,
    markRead,
    toggleReaction,
  } = useChat(conversationId);

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  const conversationIds = useSelector((s: RootState) => s.conversations.order);
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    if (conversationIds.length === 0) return;
    bootstrapped.current = true;
    for (const cid of conversationIds) {
      dispatch(fetchHistory({ conversationId: cid }));
    }
  }, [conversationIds, dispatch]);

  useEffect(() => {
    dispatch(setCurrent(conversationId));
  }, [conversationId, dispatch]);

  const handleSelect = (cid: number) => {
    setEditing(null);
    setText('');
    setDrawerOpen(false);
    navigate(`${PATHS.CHAT}/${cid}`);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate(PATHS.LOGIN);
  };

  const handleStartEdit = (msg: Message) => {
    setEditing(msg);
    setText(msg.text);
  };

  const handleFinishEdit = () => {
    if (editing && text.trim()) {
      editMessage(editing.id, text);
    }
    setEditing(null);
    setText('');
  };

  const handleSend = (value: string, media?: MediaAttachment) => {
    sendMessage(value, media, replyingTo?.id ?? null);
    setText('');
    setReplyingTo(null);
  };

  const handleReply = (msg: Message) => {
    setEditing(null);
    setReplyingTo(msg);
  };

  const handleToggleReaction = (msg: Message, emoji: string) => {
    const mine =
      msg.reactions?.some(
        (r) =>
          r.emoji === emoji &&
          me?.id !== undefined &&
          r.userIds.includes(me.id),
      ) ?? false;
    toggleReaction(msg.id, emoji, mine);
  };

  const typingUsernames = useMemo(() => {
    if (!typingMap) return [] as string[];
    const now = Date.now();
    return Object.entries(typingMap)
      .filter(
        ([uid, info]) => Number(uid) !== (me?.id ?? -1) && info.expiresAt > now,
      )
      .map(([, info]) => info.username || t('common.someone'));
  }, [typingMap, me?.id, t]);

  const totalRecipients = useMemo(
    () => (conversation ? Math.max(0, conversation.members.length - 1) : 0),
    [conversation],
  );

  const membersReadByMessageId = useMemo(() => {
    const map: Record<number, number[]> = {};
    if (!readMap) return map;
    for (const [uidStr, lastId] of Object.entries(readMap)) {
      const uid = Number(uidStr);
      if (uid === me?.id) continue;
      for (const msg of messages) {
        if (msg.id <= lastId) {
          (map[msg.id] ??= []).push(uid);
        }
      }
    }
    return map;
  }, [readMap, messages, me?.id]);

  useEffect(() => {
    if (!conversationId) return;
    const last = messages[messages.length - 1];
    if (last && last.senderId !== me?.id) {
      markRead(last.id);
    }
  }, [messages, conversationId, me?.id, markRead]);

  return (
    <div className="app-shell">
      <div className={drawerOpen ? 'app-sidebar open' : 'app-sidebar'}>
        <ConversationList
          onSelect={handleSelect}
          onNewChat={() => setNewChatOpen(true)}
          onLogout={handleLogout}
        />
      </div>
      {drawerOpen && (
        <div
          className="app-sidebar-backdrop"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <main
        className="app-main"
        style={
          conversation
            ? {
                background:
                  conversation.wallpaperUrl
                    ? `url(${conversation.wallpaperUrl}) center/cover no-repeat`
                    : conversation.theme
                      ? (CHAT_THEMES.find((t) => t.id === conversation.theme)
                          ?.gradient ?? undefined)
                      : getWallpaperBackground(prefs.wallpaper),
              }
            : { background: getWallpaperBackground(prefs.wallpaper) }
        }
      >
        {!conversation ? (
          <div className="empty-chat">
            <button
              className="icon-btn mobile-only"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('chat.openSidebar')}
              style={{ position: 'absolute', top: 16, left: 16 }}
            >
              ☰
            </button>
            <div className="empty-chat-body">
              <h2>{t('chat.selectChat')}</h2>
              <p>{t('chat.selectChatHint')}</p>
              <button
                className="primary-btn"
                onClick={() => setNewChatOpen(true)}
              >
                {t('chat.newChat')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <ChatHeader
              conversation={conversation}
              onOpenInfo={() => setInfoOpen((v) => !v)}
              onOpenMenu={() => setDrawerOpen(true)}
            />

            <div className="msg-scroll" ref={scrollRef} onScroll={onScrollMsgs}>
              {showJump && (
                <button
                  className="jump-to-bottom"
                  onClick={jumpToBottom}
                  aria-label={t('chat.scrollToLatest')}
                  title={t('chat.scrollToLatest')}
                >
                  <ChevronDown size={18} />
                </button>
              )}
              {isLoadingHistory && messages.length === 0 ? (
                <Loader fullScreen={false} message={t('chat.loadingMessages')} />
              ) : (
                <MessageList
                  messages={messages}
                  currentUserId={me?.id ?? null}
                  conversationType={conversation.type}
                  members={conversation.members}
                  membersReadByMessageId={membersReadByMessageId}
                  totalRecipients={totalRecipients}
                  onDelete={deleteMessage}
                  onEdit={handleStartEdit}
                  onReply={handleReply}
                  onToggleReaction={handleToggleReaction}
                />
              )}
              <TypingIndicator usernames={typingUsernames} />
            </div>

            <div className="msg-input-bar">
              <MessageInput
                text={text}
                setText={setText}
                editingMessage={editing}
                replyingTo={replyingTo}
                onSend={handleSend}
                onFinishEdit={handleFinishEdit}
                onCancelEdit={() => {
                  setEditing(null);
                  setText('');
                }}
                onCancelReply={() => setReplyingTo(null)}
                onTyping={onLocalTyping}
                onStopTyping={stopTyping}
              />
            </div>
          </>
        )}
      </main>

      {infoOpen && conversation && (
        <MembersPanel
          conversation={conversation}
          onClose={() => setInfoOpen(false)}
        />
      )}

      {newChatOpen && <NewChatModal onClose={() => setNewChatOpen(false)} />}
    </div>
  );
};

export default ChatPage;
