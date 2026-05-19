import { createAsyncThunk } from '@reduxjs/toolkit';

import { authApi } from '../../api/authApi';
import {
  ensureIdentityProvisioned,
  MissingIdentityError,
  VaultRestoreFailedError,
} from '../../crypto/provisioning';
import type { AuthCredentials } from '../../types/interfaces';

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: AuthCredentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      localStorage.setItem('token', response.accessToken);
      try {
        await ensureIdentityProvisioned(
          response.user.id,
          response.user.username,
          credentials.password,
          response.accessToken,
        );
      } catch (cryptoErr) {
        console.error('Crypto provisioning failed:', cryptoErr);
        if (
          cryptoErr instanceof MissingIdentityError ||
          cryptoErr instanceof VaultRestoreFailedError
        ) {
          localStorage.removeItem('token');
          return rejectWithValue(cryptoErr.message);
        }
      }
      return response;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message || 'Login failed');
      }
    }
  },
);
