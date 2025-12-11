import type { Message } from "../utils/interfaces";

const API_URL = import.meta.env.VITE_SERVER_URL;

export const chatApi = {
  async getRecentlyMessages(): Promise<Message[]> {
    const response = await fetch(`${API_URL}/chat/messages`);
    if (!response.ok) {
      throw new Error(`status: ${response.status}`);
    }
    return await response.json();
  },
};
