import { createAsyncThunk } from '@reduxjs/toolkit';

import { authApi } from '../../api/authApi';
import {
  ensureIdentityProvisioned,
  VaultMissingError,
} from '../../crypto/provisioning';
import type { AuthCredentials } from '../../types/interfaces';

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: AuthCredentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      localStorage.setItem('token', response.accessToken);
      let recoveryNeeded = false;
      try {
        await ensureIdentityProvisioned(
          response.user.id,
          response.user.username,
          credentials.password,
          response.accessToken,
        );
      } catch (cryptoErr) {
        if (cryptoErr instanceof VaultMissingError) {
          recoveryNeeded = true;
        } else {
          console.error('Crypto provisioning failed:', cryptoErr);
        }
      }
      return { ...response, recoveryNeeded };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message || 'Login failed');
      }
    }
  },
);
