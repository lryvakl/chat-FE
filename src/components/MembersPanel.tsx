import { Crown, Search, Shield, UserMinus, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Avatar } from './Avatar';
import { usersApi } from '../api/usersApi';
import type { AppDispatch, RootState } from '../store';
import { addMember, removeMember } from '../store/thunks/conversations';
import {
  ConversationRole,
  ConversationType,
  PresenceStatus,
} from '../types/enums';
import type { Conversation, User } from '../types/interfaces';
import {
  describeConversation,
  formatLastSeen,
} from '../utils/conversationDisplay';

interface MembersPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

const roleIcon = (role: ConversationRole) => {
  if (role === ConversationRole.Owner) return <Crown size={13} />;
  if (role === ConversationRole.Admin) return <Shield size={13} />;
  return null;
};

export const MembersPanel = ({ conversation, onClose }: MembersPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const me = useSelector((s: RootState) => s.auth.user);
  const presence = useSelector((s: RootState) => s.presence.byUserId);
  const isGroup = conversation.type === ConversationType.Group;
  const myRole = conversation.members.find((m) => m.userId === me?.id)?.role;
  const canManage =
    isGroup &&
    (myRole === ConversationRole.Owner || myRole === ConversationRole.Admin);

  const [addingOpen, setAddingOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);

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
                const peer = conversation.members.find(
                  (m) => m.userId !== me?.id,
                );
                if (!peer) return '';
                const p = presence[peer.userId];
                if (p?.status === PresenceStatus.Online) return 'online';
                return formatLastSeen(p?.lastSeenAt ?? null);
              })()}
        </p>
      </div>

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
                    size={36}
                    showPresence
                    isOnline={online}
                  />
                  <div className="members-list-body">
                    <p className="members-list-name">
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
