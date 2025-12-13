export interface MessageInputProps {
  onSendMessage: (text: string) => void;
  editingMessage: Message | null;
  onEditMessage: () => void;
  onCancelEdit: () => void;
  text: string;
  setText: (string: string) => void;
}

export interface MessageListProps {
  messages: Message[];
  currentUser: string;
  onDeleteMessage: (messageId: number) => void;
  onEditMessage: (message: Message) => void;
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
