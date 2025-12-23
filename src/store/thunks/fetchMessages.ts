import { createAsyncThunk } from "@reduxjs/toolkit";

import { chatApi } from "../../api/chatApi";

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (room: string, { rejectWithValue }) => {
    try {
      const response = await chatApi.getRecentMessages(room);
      return response;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
    }
    return rejectWithValue("Failed to fetch messages");
  }
);
