export interface MessageInputProps {
  onSendMessage: (text: string) => void;
}

export interface MessageListProps {
  messages: Message[];
  currentUser: string;
}

export interface Message {
  id?: number;
  text: string;
  user: string;
  room: string;
  createdAt: string;
}

export interface ChatState {
  messages: Message[];
  currentUser: string;
  currentRoom: string;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface JoinChatPayload {
  name: string;
  room: string;
}

export interface ServerError {
  status?: string;
  message: string;
}
