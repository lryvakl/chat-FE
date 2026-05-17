import type {
  ConversationRole,
  ConversationType,
  PresenceStatus,
} from './enums';

export interface UserProfile {
  id: number;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  accentColor?: string | null;
  showLastSeen?: boolean;
  lastSeenAt?: string | null;
}

export interface User extends UserProfile {}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ConversationMemberSummary {
  userId: number;
  username: string;
  role: ConversationRole;
  displayName?: string | null;
  avatarUrl?: string | null;
  customStatus?: string | null;
}

export interface LastMessagePreview {
  id: number;
  text: string;
  senderId: number | null;
  createdAt: string;
  isEncrypted?: boolean;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: number[];
}

export interface Conversation {
  id: number;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  description?: string | null;
  pinnedMessageId?: number | null;
  createdAt: string;
  members: ConversationMemberSummary[];
  lastMessage: LastMessagePreview | null;
  lastReadMessageId: number | null;
  unreadCount?: number;
  isMuted?: boolean;
  isPinned?: boolean;
  theme?: string | null;
  wallpaperUrl?: string | null;
}

export interface ConversationDetails extends Omit<Conversation, 'lastMessage'> {
  lastReadMessageId: number | null;
}

export interface MessageMedia {
  id: number;
  key: string;
  nonce: string;
  mime: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
  durationSec?: number;
}

export interface MessageReplyPreview {
  id: number;
  text: string | null;
  isEncrypted?: boolean;
  senderId: number | null;
  senderUsername: string | null;
}

export interface Message {
  id: number;
  conversationId: number;
  text: string;
  isEncrypted?: boolean;
  media?: MessageMedia;
  senderId: number | null;
  senderUsername: string | null;
  createdAt: string;
  editedAt: string | null;
  replyToId?: number | null;
  replyTo?: MessageReplyPreview | null;
  reactions?: ReactionSummary[];
}

export interface RawIncomingMessage {
  id: number;
  conversationId: number;
  text: string | null;
  ciphertext: string | null;
  header: string | null;
  isEncrypted: boolean;
  senderId: number | null;
  senderUsername: string | null;
  createdAt: string;
  editedAt: string | null;
  replyToId?: number | null;
  replyTo?: MessageReplyPreview | null;
  reactions?: ReactionSummary[];
}

export interface PresencePayload {
  userId: number;
  status: PresenceStatus;
  lastSeenAt: string | null;
}

export interface TypingPayload {
  conversationId: number;
  userId: number;
  username?: string;
}

export interface ReadReceiptPayload {
  conversationId: number;
  userId: number;
  lastReadMessageId: number;
}

export interface MessageDeletedPayload {
  id: number;
  conversationId: number;
}

export interface ReactionUpdatedPayload {
  messageId: number;
  conversationId: number;
  reactions: ReactionSummary[];
}

export interface ServerError {
  status?: string;
  message: string;
}

export interface LoaderProps {
  fullScreen?: boolean;
  message?: string;
}
