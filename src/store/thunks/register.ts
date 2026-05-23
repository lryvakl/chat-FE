import { createAsyncThunk } from '@reduxjs/toolkit';

import { authApi } from '../../api/authApi';
import { provisionNewIdentity } from '../../crypto/provisioning';
import type { AuthCredentials } from '../../types/interfaces';

export const registerUser = createAsyncThunk(
  'auth/register',
  async (credentials: AuthCredentials, { rejectWithValue }) => {
    try {
      const response = await authApi.register(credentials);
      localStorage.setItem('token', response.accessToken);
      try {
        await provisionNewIdentity(
          response.user.id,
          response.user.username,
          credentials.password,
          response.accessToken,
        );
      } catch (cryptoErr) {
        console.error('Identity provisioning failed:', cryptoErr);
      }
      return response;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message || 'Registration failed');
      }
    }
  },
);
