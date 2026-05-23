import http from './axios.instance';
import type { ConversationRole } from '../types/enums';
import type {
  Conversation,
  ConversationDetails,
  RawIncomingMessage,
  ReactionSummary,
} from '../types/interfaces';

export interface CreateGroupPayload {
  name: string;
  memberIds: number[];
  avatarUrl?: string;
  description?: string;
}

export interface HistoryQuery {
  limit?: number;
  beforeId?: number;
}

export interface UpdateConversationPayload {
  name?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  pinnedMessageId?: number | null;
}

export interface UpdateMembershipPayload {
  isMuted?: boolean;
  isPinned?: boolean;
  theme?: string | null;
  wallpaperUrl?: string | null;
}

export interface ReactionResponse {
  messageId: number;
  conversationId: number;
  reactions: ReactionSummary[];
}

export const conversationsApi = {
  async list(): Promise<Conversation[]> {
    const { data } = await http.get<Conversation[]>('conversations');
    return data;
  },

  async getOne(id: number): Promise<ConversationDetails> {
    const { data } = await http.get<ConversationDetails>(`conversations/${id}`);
    return data;
  },

  async createDm(peerId: number): Promise<ConversationDetails> {
    const { data } = await http.post<ConversationDetails>('conversations/dm', {
      peerId,
    });
    return data;
  },

  async createGroup(payload: CreateGroupPayload): Promise<ConversationDetails> {
    const { data } = await http.post<ConversationDetails>(
      'conversations/group',
      payload,
    );
    return data;
  },

  async update(
    conversationId: number,
    payload: UpdateConversationPayload,
  ): Promise<ConversationDetails> {
    const { data } = await http.patch<ConversationDetails>(
      `conversations/${conversationId}`,
      payload,
    );
    return data;
  },

  async updateMembership(
    conversationId: number,
    payload: UpdateMembershipPayload,
  ): Promise<ConversationDetails> {
    const { data } = await http.patch<ConversationDetails>(
      `conversations/${conversationId}/membership`,
      payload,
    );
    return data;
  },

  async addMember(
    conversationId: number,
    userId: number,
    role?: ConversationRole,
  ): Promise<ConversationDetails> {
    const { data } = await http.post<ConversationDetails>(
      `conversations/${conversationId}/members`,
      { userId, role },
    );
    return data;
  },

  async removeMember(conversationId: number, userId: number): Promise<void> {
    await http.delete(`conversations/${conversationId}/members/${userId}`);
  },

  async history(
    conversationId: number,
    query: HistoryQuery = {},
  ): Promise<RawIncomingMessage[]> {
    const { data } = await http.get<RawIncomingMessage[]>(
      `conversations/${conversationId}/messages`,
      { params: query },
    );
    return data;
  },

  async addReaction(
    conversationId: number,
    messageId: number,
    emoji: string,
  ): Promise<ReactionResponse> {
    const { data } = await http.post<ReactionResponse>(
      `conversations/${conversationId}/messages/${messageId}/reactions`,
      { emoji },
    );
    return data;
  },

  async removeReaction(
    conversationId: number,
    messageId: number,
    emoji: string,
  ): Promise<ReactionResponse> {
    const { data } = await http.delete<ReactionResponse>(
      `conversations/${conversationId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    );
    return data;
  },
};
