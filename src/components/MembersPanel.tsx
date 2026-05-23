import {
  Crown,
  FileIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Mic,
  Search,
  Shield,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Avatar } from './Avatar';
import { MediaBubble } from './MediaBubble';
import { usersApi } from '../api/usersApi';
import type { AppDispatch, RootState } from '../store';
import { addMember, removeMember } from '../store/thunks/conversations';
import {
  ConversationRole,
  ConversationType,
  PresenceStatus,
} from '../types/enums';
import type {
  Conversation,
  Message,
  User,
  UserProfile,
} from '../types/interfaces';
import {
  describeConversation,
  formatLastSeen,
} from '../utils/conversationDisplay';

interface MembersPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

type SharedTab = 'media' | 'voice' | 'files' | 'links';

const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+/gi;

const roleIcon = (role: ConversationRole) => {
  if (role === ConversationRole.Owner) return <Crown size={13} />;
  if (role === ConversationRole.Admin) return <Shield size={13} />;
  return null;
};

interface ExtractedLink {
  messageId: number;
  url: string;
  createdAt: string;
}

const extractLinks = (messages: Message[]): ExtractedLink[] => {
  const out: ExtractedLink[] = [];
  for (const m of messages) {
    if (!m.text) continue;
    const matches = m.text.match(URL_REGEX);
    if (!matches) continue;
    for (const url of matches) {
      out.push({ messageId: m.id, url, createdAt: m.createdAt });
    }
  }
  return out.reverse();
};

const safeHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

export const MembersPanel = ({ conversation, onClose }: MembersPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const me = useSelector((s: RootState) => s.auth.user);
  const presence = useSelector((s: RootState) => s.presence.byUserId);
  const messages = useSelector(
    (s: RootState) => s.messages.byConversation[conversation.id] ?? [],
  );
  const isGroup = conversation.type === ConversationType.Group;
  const myRole = conversation.members.find((m) => m.userId === me?.id)?.role;
  const canManage =
    isGroup &&
    (myRole === ConversationRole.Owner || myRole === ConversationRole.Admin);

  const peer = isGroup
    ? null
    : (conversation.members.find((m) => m.userId !== me?.id) ?? null);

  const [addingOpen, setAddingOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [peerProfile, setPeerProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<SharedTab>('media');

  useEffect(() => {
    if (!peer) {
      setPeerProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await usersApi.getOne(peer.userId);
        if (!cancelled) setPeerProfile(profile);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peer?.userId]);

  useEffect(() => {
    if (!addingOpen) return;
    const t = window.setTimeout(async () => {
      try {
        const users = await usersApi.search(query);
        setResults(users);
      } catch (err) {
        console.error(err);
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [query, addingOpen]);

  const sharedMedia = useMemo(
    () =>
      [...messages]
        .filter((m) => m.media && m.media.mime.startsWith('image/'))
        .reverse(),
    [messages],
  );
  const sharedVoice = useMemo(
    () =>
      [...messages]
        .filter((m) => m.media && m.media.mime.startsWith('audio/'))
        .reverse(),
    [messages],
  );
  const sharedFiles = useMemo(
    () =>
      [...messages]
        .filter(
          (m) =>
            m.media &&
            !m.media.mime.startsWith('image/') &&
            !m.media.mime.startsWith('audio/'),
        )
        .reverse(),
    [messages],
  );
  const sharedLinks = useMemo(() => extractLinks(messages), [messages]);

  const display = describeConversation(conversation, me?.id ?? null);

  const handleAdd = async (user: User) => {
    try {
      await dispatch(
        addMember({ conversationId: conversation.id, userId: user.id }),
      ).unwrap();
      setQuery('');
      setResults([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (userId: number) => {
    try {
      await dispatch(
        removeMember({
          conversationId: conversation.id,
          userId,
          selfUserId: me?.id,
        }),
      ).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const peerBio = peerProfile?.bio?.trim() || null;

  return (
    <aside className="members-panel">
      <div className="members-panel-header">
        <h3>{isGroup ? 'Group info' : 'Contact'}</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="members-panel-hero">
        <Avatar
          seed={display.avatarSeed}
          avatarUrl={display.avatarUrl}
          isGroup={isGroup}
          size={96}
        />
        <p className="members-panel-title">{display.title}</p>
        <p className="members-panel-sub">
          {isGroup
            ? `${conversation.members.length} members`
            : (() => {
                if (!peer) return '';
                const p = presence[peer.userId];
                if (p?.status === PresenceStatus.Online) return 'online';
                return formatLastSeen(p?.lastSeenAt ?? null);
              })()}
        </p>
      </div>

      {!isGroup && peerBio && (
        <div className="profile-bio-block">
          <div className="profile-bio-label">Bio</div>
          <p className="profile-bio-text">{peerBio}</p>
        </div>
      )}

      {!isGroup && (
        <div className="shared-section">
          <div className="shared-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'media'}
              className={`shared-tab ${activeTab === 'media' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              <ImageIcon size={14} />
              <span>Media</span>
              <span className="shared-tab-count">{sharedMedia.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'voice'}
              className={`shared-tab ${activeTab === 'voice' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('voice')}
            >
              <Mic size={14} />
              <span>Voice</span>
              <span className="shared-tab-count">{sharedVoice.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'files'}
              className={`shared-tab ${activeTab === 'files' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              <FileIcon size={14} />
              <span>Files</span>
              <span className="shared-tab-count">{sharedFiles.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'links'}
              className={`shared-tab ${activeTab === 'links' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('links')}
            >
              <LinkIcon size={14} />
              <span>Links</span>
              <span className="shared-tab-count">{sharedLinks.length}</span>
            </button>
          </div>

          <div className="shared-panel">
            {activeTab === 'media' &&
              (sharedMedia.length === 0 ? (
                <p className="shared-empty">No media yet</p>
              ) : (
                <div className="shared-media-grid">
                  {sharedMedia.map((m) => (
                    <div key={m.id} className="shared-media-cell">
                      <MediaBubble media={m.media!} />
                    </div>
                  ))}
                </div>
              ))}

            {activeTab === 'voice' &&
              (sharedVoice.length === 0 ? (
                <p className="shared-empty">No voice messages yet</p>
              ) : (
                <div className="shared-list">
                  {sharedVoice.map((m) => (
                    <div key={m.id} className="shared-list-item">
                      <MediaBubble media={m.media!} />
                    </div>
                  ))}
                </div>
              ))}

            {activeTab === 'files' &&
              (sharedFiles.length === 0 ? (
                <p className="shared-empty">No files yet</p>
              ) : (
                <div className="shared-list">
                  {sharedFiles.map((m) => (
                    <div key={m.id} className="shared-list-item">
                      <MediaBubble media={m.media!} />
                    </div>
                  ))}
                </div>
              ))}

            {activeTab === 'links' &&
              (sharedLinks.length === 0 ? (
                <p className="shared-empty">No links yet</p>
              ) : (
                <div className="shared-list">
                  {sharedLinks.map((l, i) => (
                    <a
                      key={`${l.messageId}-${i}`}
                      className="shared-link-item"
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkIcon size={14} className="shared-link-icon" />
                      <div className="shared-link-body">
                        <span className="shared-link-host">
                          {safeHost(l.url)}
                        </span>
                        <span className="shared-link-url">{l.url}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ))}
          </div>
        </div>
      )}

      {isGroup && (
        <>
          <div className="members-panel-section-title">Members</div>
          <div className="members-list">
            {conversation.members.map((member) => {
              const p = presence[member.userId];
              const online = p?.status === PresenceStatus.Online;
              const isMe = member.userId === me?.id;
              const canKick =
                canManage && !isMe && member.role !== ConversationRole.Owner;
              return (
                <div key={member.userId} className="members-list-item">
                  <Avatar
                    seed={member.username}
                    avatarUrl={member.avatarUrl ?? null}
                    accentColor={member.accentColor ?? null}
                    size={36}
                    showPresence
                    isOnline={online}
                  />
                  <div className="members-list-body">
                    <p
                      className="members-list-name"
                      style={
                        member.accentColor
                          ? { color: member.accentColor }
                          : undefined
                      }
                    >
                      {member.username}
                      {isMe && <span className="members-self-tag"> · you</span>}
                    </p>
                    <p className="members-list-role">
                      {roleIcon(member.role)} {member.role}
                    </p>
                  </div>
                  {canKick && (
                    <button
                      className="icon-btn danger"
                      onClick={() => handleRemove(member.userId)}
                      aria-label="Remove member"
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {canManage && (
            <div className="members-panel-add">
              {!addingOpen && (
                <button
                  className="secondary-btn"
                  onClick={() => setAddingOpen(true)}
                >
                  <UserPlus size={16} /> Add member
                </button>
              )}
              {addingOpen && (
                <>
                  <div className="modal-search">
                    <Search size={16} className="modal-search-icon" />
                    <input
                      className="modal-input modal-input-search"
                      placeholder="Search users…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="modal-results modal-results-inline">
                    {results
                      .filter(
                        (u) =>
                          !conversation.members.find((m) => m.userId === u.id),
                      )
                      .map((u) => (
                        <button
                          key={u.id}
                          className="modal-result"
                          onClick={() => handleAdd(u)}
                        >
                          <Avatar
                            seed={u.username}
                            avatarUrl={u.avatarUrl ?? null}
                            size={34}
                          />
                          <span className="modal-result-name">
                            {u.username}
                          </span>
                        </button>
                      ))}
                    {results.length === 0 && query.trim() && (
                      <p className="modal-empty">No matches</p>
                    )}
                  </div>
                  <button
                    className="link-btn"
                    onClick={() => {
                      setAddingOpen(false);
                      setQuery('');
                      setResults([]);
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {isGroup && (
            <button
              className="danger-btn"
              onClick={() => me && handleRemove(me.id)}
            >
              Leave group
            </button>
          )}
        </>
      )}
    </aside>
  );
};
