export enum SocketEvent {
  SendMessage = "sendMessage",
  ReceiveMessage = "receiveMessage",
  JoinRoom = "joinRoom",
  DeleteMessage = "deleteMessage",
  MessageDeleted = "messageDeleted",
  ConnectionError = "connect_error",
  Exeption = "exeption",
}

export enum Room {
  General = "General",
  Tech = "Tech",
  Random = "Random",
}
