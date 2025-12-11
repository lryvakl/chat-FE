import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Message, ChatState, JoinChatPayload } from "../utils/interfaces";

const initialState: ChatState = {
  messages: [],
  currentUser: "",
  currentRoom: "",
  isConnected: false,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    joinChat: (state, action: PayloadAction<JoinChatPayload>) => {
      state.currentUser = action.payload.name;
      state.currentRoom = action.payload.room;
    },

    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
  },
});

export const { joinChat, setConnectionStatus, addMessage } = chatSlice.actions;
export default chatSlice.reducer;
