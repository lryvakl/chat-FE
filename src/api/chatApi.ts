import type { Message } from "../types/interfaces";
import { API_BASE_URL } from "../constants/index";

export const chatApi = {
  async getRecentMessages(room: string): Promise<Message[]> {
    const response = await fetch(`${API_BASE_URL}/chat/messages?room=${room}`);
    if (!response.ok) {
      throw new Error(`status: ${response.status}`);
    }
    return await response.json();
  },
};
