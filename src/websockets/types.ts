export interface SendMessagePayload {
  username: string;
  room: string;
  text: string;
}

export interface DeleteMessagePayload {
  messageId: number;
  room: string;
  username: string;
}

export interface EditMessagePayload {
  messageId: number;
  text: string;
  room: string;
  username: string;
}
