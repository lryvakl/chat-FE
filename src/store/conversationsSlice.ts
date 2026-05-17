import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type {
  Conversation,
  ConversationDetails,
  ConversationMemberSummary,
  Message,
  ReadReceiptPayload,
  UserProfile,
} from '../types/interfaces';
import {
  addMember,
  createGroup,
  fetchConversation,
  fetchConversations,
  openDm,
  removeMember,
  updateConversation,
  updateMembership,
} from './thunks/conversations';

interface ConversationsState {
  byId: Record<number, Conversation>;
  order: number[];
  currentId: number | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ConversationsState = {
  byId: {},
  order: [],
  currentId: null,
  isLoading: false,
  error: null,
};

const upsert = (state: ConversationsState, conv: Conversation) => {
  if (!state.byId[conv.id]) state.order.unshift(conv.id);
  const existing = state.byId[conv.id];
  state.byId[conv.id] = {
    ...existing,
    ...conv,
    lastMessage: conv.lastMessage ?? existing?.lastMessage ?? null,
  };
};

const detailToConversation = (c: ConversationDetails): Conversation => ({
  id: c.id,
  type: c.type,
  name: c.name,
  avatarUrl: c.avatarUrl,
  description: c.description ?? null,
  pinnedMessageId: c.pinnedMessageId ?? null,
  createdAt: c.createdAt,
  members: c.members,
  lastReadMessageId: c.lastReadMessageId,
  lastMessage: null,
  isMuted: c.isMuted ?? false,
  isPinned: c.isPinned ?? false,
  theme: c.theme ?? null,
  wallpaperUrl: c.wallpaperUrl ?? null,
});

const slice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    upsertConversation: (
      state,
      action: PayloadAction<Conversation | ConversationDetails>,
    ) => {
      const conv =
        'lastMessage' in action.payload
          ? (action.payload as Conversation)
          : detailToConversation(action.payload as ConversationDetails);
      upsert(state, conv);
    },
    removeMemberFromConversation: (
      state,
      action: PayloadAction<{
        conversationId: number;
        userId: number;
        selfUserId: number;
      }>,
    ) => {
      const { conversationId, userId, selfUserId } = action.payload;
      if (userId === selfUserId) {
        delete state.byId[conversationId];
        state.order = state.order.filter((id) => id !== conversationId);
        if (state.currentId === conversationId) state.currentId = null;
        return;
      }
      const conv = state.byId[conversationId];
      if (!conv) return;
      conv.members = conv.members.filter((m) => m.userId !== userId);
    },
    setCurrent: (state, action: PayloadAction<number | null>) => {
      state.currentId = action.payload;
      if (action.payload !== null) {
        const conv = state.byId[action.payload];
        if (conv) conv.unreadCount = 0;
      }
    },
    setLastMessage: (
      state,
      action: PayloadAction<{
        conversationId: number;
        message: Message;
        myUserId: number;
      }>,
    ) => {
      const conv = state.byId[action.payload.conversationId];
      if (!conv) return;
      conv.lastMessage = {
        id: action.payload.message.id,
        text: action.payload.message.text,
        senderId: action.payload.message.senderId,
        createdAt: action.payload.message.createdAt,
        isEncrypted: action.payload.message.isEncrypted ?? false,
      };
      if (
        action.payload.message.senderId !== action.payload.myUserId &&
        action.payload.conversationId !== state.currentId
      ) {
        conv.unreadCount = (conv.unreadCount ?? 0) + 1;
      }
      state.order = [
        action.payload.conversationId,
        ...state.order.filter((id) => id !== action.payload.conversationId),
      ];
    },
    applyReadReceipt: (state, action: PayloadAction<ReadReceiptPayload>) => {
      const conv = state.byId[action.payload.conversationId];
      if (!conv) return;
      const m = conv.members.find((m) => m.userId === action.payload.userId);
      if (!m) return;
    },
    applyMemberProfile: (
      state,
      action: PayloadAction<{ userId: number; profile: UserProfile }>,
    ) => {
      const { userId, profile } = action.payload;
      for (const convId of state.order) {
        const conv = state.byId[convId];
        if (!conv) continue;
        conv.members = conv.members.map(
          (m): ConversationMemberSummary =>
            m.userId === userId
              ? {
                  ...m,
                  username: profile.username ?? m.username,
                  displayName: profile.displayName ?? m.displayName,
                  avatarUrl: profile.avatarUrl ?? m.avatarUrl,
                  customStatus: profile.customStatus ?? m.customStatus,
                }
              : m,
        );
      }
    },
    updateLastReadForMe: (
      state,
      action: PayloadAction<{ conversationId: number; messageId: number }>,
    ) => {
      const conv = state.byId[action.payload.conversationId];
      if (!conv) return;
      conv.lastReadMessageId = Math.max(
        conv.lastReadMessageId ?? 0,
        action.payload.messageId,
      );
      conv.unreadCount = 0;
    },
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.byId = {};
        state.order = [];
        for (const c of action.payload) {
          state.byId[c.id] = c;
          state.order.push(c.id);
        }
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to load chats';
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        upsert(state, detailToConversation(action.payload));
      })
      .addCase(openDm.fulfilled, (state, action) => {
        upsert(state, detailToConversation(action.payload));
        state.currentId = action.payload.id;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        upsert(state, detailToConversation(action.payload));
        state.currentId = action.payload.id;
      })
      .addCase(updateConversation.fulfilled, (state, action) => {
        upsert(state, detailToConversation(action.payload));
      })
      .addCase(updateMembership.fulfilled, (state, action) => {
        upsert(state, detailToConversation(action.payload));
      })
      .addCase(addMember.fulfilled, (state, action) => {
        upsert(state, detailToConversation(action.payload));
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        const conv = state.byId[action.payload.conversationId];
        if (!conv) return;
        conv.members = conv.members.filter(
          (m) => m.userId !== action.payload.userId,
        );
      });
  },
});

export const {
  setCurrent,
  setLastMessage,
  updateLastReadForMe,
  upsertConversation,
  removeMemberFromConversation,
  applyMemberProfile,
  reset: resetConversations,
} = slice.actions;
export default slice.reducer;
