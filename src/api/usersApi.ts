import http from './axios.instance';
import type { User, UserProfile } from '../types/interfaces';

export interface UpdateProfilePayload {
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  accentColor?: string | null;
  showLastSeen?: boolean;
}

export const usersApi = {
  async search(query: string): Promise<User[]> {
    const { data } = await http.get<User[]>('users/search', {
      params: { q: query },
    });
    return data;
  },

  async me(): Promise<UserProfile> {
    const { data } = await http.get<UserProfile>('users/me');
    return data;
  },

  async updateMe(payload: UpdateProfilePayload): Promise<UserProfile> {
    const { data } = await http.patch<UserProfile>('users/me', payload);
    return data;
  },

  async getOne(id: number): Promise<UserProfile> {
    const { data } = await http.get<UserProfile>(`users/${id}`);
    return data;
  },
};
