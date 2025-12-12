import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Message, ChatState, JoinChatPayload } from "../types/interfaces";
import { chatApi } from "../api/chatApi";

const initialState: ChatState = {
  messages: [],
  currentUser: "",
  currentRoom: "",
  isConnected: false,
  isLoading: false,
  error: null,
};

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (room: string) => {
    const response = await chatApi.getRecentMessages(room);
    return response;
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    joinChat: (state, action: PayloadAction<JoinChatPayload>) => {
      state.currentUser = action.payload.name;
      state.currentRoom = action.payload.room;
      state.messages = [];
      state.error = null;
      state.isLoading = false;
    },

    leaveChat: () => {
      return initialState;
    },

    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    removeMessage: (state, action: PayloadAction<number>) => {
      state.messages = state.messages.filter(
        (msg) => msg.id !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = true;
        state.error = action.error.message || "Something went wrong";
        console.error(action.error);
      });
  },
});

export const {
  joinChat,
  leaveChat,
  setConnectionStatus,
  addMessage,
  removeMessage,
} = chatSlice.actions;
export default chatSlice.reducer;
