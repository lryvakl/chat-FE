import { createSlice, isAnyOf } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import { loginUser } from "../store/thunks/login";
import { registerUser } from "../store/thunks/register";
import type { AuthState, AuthResponse } from "../types/interfaces";

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: () => initialState,
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        isAnyOf(registerUser.fulfilled, loginUser.fulfilled),
        (state, action: PayloadAction<AuthResponse | undefined>) => {
          if (action.payload) {
            state.isLoading = false;
            state.token = action.payload.accessToken;
            state.user = action.payload.user;
          }
        }
      )
      .addMatcher(isAnyOf(registerUser.pending, loginUser.pending), (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(
        isAnyOf(registerUser.rejected, loginUser.rejected),
        (state, action) => {
          state.isLoading = false;
          state.error = (action.payload as string) || "Something went wrong";
        }
      );
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
