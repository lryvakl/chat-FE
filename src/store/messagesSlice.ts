import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type {
  Message,
  MessageDeletedPayload,
  ReactionUpdatedPayload,
} from '../types/interfaces';
import { fetchHistory } from './thunks/messages';

interface MessagesState {
  byConversation: Record<number, Message[]>;
  loadingByConversation: Record<number, boolean>;
}

const initialState: MessagesState = {
  byConversation: {},
  loadingByConversation: {},
};

const slice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    upsertMessage: (state, action: PayloadAction<Message>) => {
      const list = state.byConversation[action.payload.conversationId] ?? [];
      const idx = list.findIndex((m) => m.id === action.payload.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...action.payload };
      else list.push(action.payload);
      state.byConversation[action.payload.conversationId] = list;
    },
    markDeleted: (state, action: PayloadAction<MessageDeletedPayload>) => {
      const list = state.byConversation[action.payload.conversationId];
      if (!list) return;
      state.byConversation[action.payload.conversationId] = list.filter(
        (m) => m.id !== action.payload.id,
      );
    },
    applyReactions: (state, action: PayloadAction<ReactionUpdatedPayload>) => {
      const list = state.byConversation[action.payload.conversationId];
      if (!list) return;
      const idx = list.findIndex((m) => m.id === action.payload.messageId);
      if (idx < 0) return;
      list[idx] = { ...list[idx], reactions: action.payload.reactions };
    },
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHistory.pending, (state, action) => {
        state.loadingByConversation[action.meta.arg.conversationId] = true;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.loadingByConversation[action.payload.conversationId] = false;
        const existing =
          state.byConversation[action.payload.conversationId] ?? [];
        const merged = [...action.payload.messages];
        for (const msg of existing) {
          if (!merged.find((m) => m.id === msg.id)) merged.push(msg);
        }
        merged.sort((a, b) => a.id - b.id);
        state.byConversation[action.payload.conversationId] = merged;
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.loadingByConversation[action.meta.arg.conversationId] = false;
      });
  },
});

export const {
  upsertMessage,
  markDeleted,
  applyReactions,
  reset: resetMessages,
} = slice.actions;
export default slice.reducer;
