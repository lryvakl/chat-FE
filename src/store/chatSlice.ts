import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Message, ChatState, JoinChatPayload } from "../utils/interfaces";
import { chatApi } from "../api/chatApi";

const initialState: ChatState = {
  messages: [],
  currentUser: "",
  currentRoom: "",
  isConnected: false,
};

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async () => {
    const response = await chatApi.getRecentlyMessages();
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
    },

    leaveChat: (state) => {
      state.currentUser = "";
      state.currentRoom = "";
      state.messages = [];
      state.isConnected = false;
    },

    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        console.error(action.error);
      });
  },
});

export const { joinChat, leaveChat, setConnectionStatus, addMessage } =
  chatSlice.actions;
export default chatSlice.reducer;
