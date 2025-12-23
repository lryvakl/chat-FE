import { createAsyncThunk } from "@reduxjs/toolkit";

import { authApi } from "../../api/authApi";
import type { AuthCredentials } from "../../types/interfaces";

export const registerUser = createAsyncThunk(
  "auth/register",
  async (credentials: AuthCredentials, { rejectWithValue }) => {
    try {
      const response = await authApi.register(credentials);
      localStorage.setItem("token", response.accessToken);
      return response;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message || "Registration failed");
      }
    }
  }
);
