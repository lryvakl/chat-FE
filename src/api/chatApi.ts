import type { Message } from "../types/interfaces";
import { SERVER_URL } from "../constants/index";

export const chatApi = {
  async getRecentMessages(room: string): Promise<Message[]> {
    const response = await fetch(`${SERVER_URL}/chat/messages?room=${room}`);
    if (!response.ok) {
      throw new Error(`status: ${response.status}`);
    }
    return await response.json();
  },
};
