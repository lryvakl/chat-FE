export interface MessageInputProps {
  onSendMessage: (text: string) => void;
}

export interface Message {
  text: string;
  user: string;
  createdAt: string;
}

export interface ChatState {
  messages: Message[];
  currentUser: string;
  isConnected: boolean;
}
