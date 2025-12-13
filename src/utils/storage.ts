import type { ChatSession } from "../types/interfaces";
import { SESSION_KEY } from "../constants/index";

export const loadSession = (): ChatSession | null => {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Failed to load session from storage", error);
    return null;
  }
};

export const saveSession = (session: ChatSession): void => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save session to storage", error);
  }
};

export const clearSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("Failed to clear session from storage", error);
  }
};
