import { createAsyncThunk } from "@reduxjs/toolkit";

import { authApi } from "../../api/authApi";
import type { AuthCredentials } from "../../types/interfaces";

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials: AuthCredentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      localStorage.setItem("token", response.accessToken);
      return response;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message || "Login failed");
      }
    }
  }
);
