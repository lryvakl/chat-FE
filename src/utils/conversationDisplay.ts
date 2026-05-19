import { ConversationType } from '../types/enums';
import type { Conversation, User } from '../types/interfaces';

export interface ConversationDisplay {
  title: string;
  subtitle: string;
  avatarSeed: string;
  avatarUrl: string | null;
  peerUserId: number | null;
  peerAccentColor: string | null;
}

export const describeConversation = (
  conv: Conversation,
  currentUserId: number | null,
): ConversationDisplay => {
  if (conv.type === ConversationType.Dm) {
    const peer = conv.members.find((m) => m.userId !== currentUserId);
    return {
      title: peer?.username ?? 'Direct chat',
      subtitle: 'Direct message',
      avatarSeed: peer?.username ?? String(conv.id),
      avatarUrl: peer?.avatarUrl ?? null,
      peerUserId: peer?.userId ?? null,
      peerAccentColor: peer?.accentColor ?? null,
    };
  }
  return {
    title: conv.name ?? 'Group',
    subtitle: `${conv.members.length} members`,
    avatarSeed: conv.name ?? String(conv.id),
    avatarUrl: conv.avatarUrl ?? null,
    peerUserId: null,
    peerAccentColor: null,
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
): string => {
  if (!lastSeenAt) return 'offline';
  const date = new Date(lastSeenAt);
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60_000) return 'last seen just now';
  if (diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000);
    return `last seen ${minutes} min ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000);
    return `last seen ${hours} h ago`;
  }
  return `last seen ${date.toLocaleDateString()}`;
};

export const formatPeerSubtitle = (
  peer: User | null | undefined,
  isOnline: boolean,
): string => {
  if (isOnline) return 'online';
  return formatLastSeen(peer?.lastSeenAt);
};
