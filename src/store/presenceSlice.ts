import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { PresenceStatus } from '../types/enums';
import type {
  PresencePayload,
  ReadReceiptPayload,
  TypingPayload,
} from '../types/interfaces';

interface PresenceState {
  byUserId: Record<
    number,
    { status: PresenceStatus; lastSeenAt: string | null }
  >;
  typingByConversation: Record<
    number,
    Record<number, { username: string; expiresAt: number }>
  >;
  readByConversation: Record<number, Record<number, number>>;
}

const initialState: PresenceState = {
  byUserId: {},
  typingByConversation: {},
  readByConversation: {},
};

const slice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    applyPresence: (state, action: PayloadAction<PresencePayload>) => {
      state.byUserId[action.payload.userId] = {
        status: action.payload.status,
        lastSeenAt: action.payload.lastSeenAt,
      };
    },
    applyTyping: (
      state,
      action: PayloadAction<TypingPayload & { ttlMs?: number }>,
    ) => {
      const { conversationId, userId, username, ttlMs = 4000 } = action.payload;
      const map = state.typingByConversation[conversationId] ?? {};
      map[userId] = {
        username: username ?? '',
        expiresAt: Date.now() + ttlMs,
      };
      state.typingByConversation[conversationId] = map;
    },
    clearTyping: (
      state,
      action: PayloadAction<{ conversationId: number; userId: number }>,
    ) => {
      const map = state.typingByConversation[action.payload.conversationId];
      if (!map) return;
      delete map[action.payload.userId];
    },
    pruneExpiredTyping: (state) => {
      const now = Date.now();
      for (const convId of Object.keys(state.typingByConversation)) {
        const map = state.typingByConversation[Number(convId)];
        for (const uid of Object.keys(map)) {
          if (map[Number(uid)].expiresAt < now) delete map[Number(uid)];
        }
      }
    },
    applyRead: (state, action: PayloadAction<ReadReceiptPayload>) => {
      const conv =
        state.readByConversation[action.payload.conversationId] ?? {};
      conv[action.payload.userId] = Math.max(
        conv[action.payload.userId] ?? 0,
        action.payload.lastReadMessageId,
      );
      state.readByConversation[action.payload.conversationId] = conv;
    },
    reset: () => initialState,
  },
});

export const {
  applyPresence,
  applyTyping,
  clearTyping,
  pruneExpiredTyping,
  applyRead,
  reset: resetPresence,
} = slice.actions;
export default slice.reducer;
