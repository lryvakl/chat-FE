import http from "./axios.instance";
import type { AuthCredentials, AuthResponse } from "../types/interfaces";

export const authApi = {
  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>("auth/login", credentials);
    return data;
  },

  async register(credentials: AuthCredentials): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>(
      "auth/register",
      credentials
    );
    return data;
  },
};
