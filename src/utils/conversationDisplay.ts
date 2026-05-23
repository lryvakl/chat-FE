import type { TFunction } from 'i18next';

import { ConversationType } from '../types/enums';
import type { Conversation, User } from '../types/interfaces';

export interface ConversationDisplay {
  title: string;
  subtitle: string;
  avatarSeed: string;
  avatarUrl: string | null;
  peerUserId: number | null;
}

export const describeConversation = (
  conv: Conversation,
  currentUserId: number | null,
  t?: TFunction,
): ConversationDisplay => {
  if (conv.type === ConversationType.Dm) {
    const peer = conv.members.find((m) => m.userId !== currentUserId);
    return {
      title: peer?.username ?? (t ? t('chat.directChat') : 'Direct chat'),
      subtitle: t ? t('chat.directMessage') : 'Direct message',
      avatarSeed: peer?.username ?? String(conv.id),
      avatarUrl: peer?.avatarUrl ?? null,
      peerUserId: peer?.userId ?? null,
    };
  }
  return {
    title: conv.name ?? 'Group',
    subtitle: t
      ? t('members.memberCount', { count: conv.members.length })
      : `${conv.members.length} members`,
    avatarSeed: conv.name ?? String(conv.id),
    avatarUrl: conv.avatarUrl ?? null,
    peerUserId: null,
  };
};

export const initialsFor = (seed: string): string => {
  const trimmed = seed.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
};

export const formatLastSeen = (
  lastSeenAt: string | null | undefined,
  t?: TFunction,
): string => {
  if (!lastSeenAt) return t ? t('lastSeen.offline') : 'offline';
  const date = new Date(lastSeenAt);
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60_000) return t ? t('lastSeen.justNow') : 'last seen just now';
  if (diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000);
    return t
      ? t('lastSeen.minutesAgo', { count: minutes })
      : `last seen ${minutes} min ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000);
    return t
      ? t('lastSeen.hoursAgo', { count: hours })
      : `last seen ${hours} h ago`;
  }
  return t
    ? t('lastSeen.onDate', { date: date.toLocaleDateString() })
    : `last seen ${date.toLocaleDateString()}`;
};

export const formatPeerSubtitle = (
  peer: User | null | undefined,
  isOnline: boolean,
  t?: TFunction,
): string => {
  if (isOnline) return t ? t('common.online') : 'online';
  return formatLastSeen(peer?.lastSeenAt, t);
};
