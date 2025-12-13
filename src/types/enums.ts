export enum SocketEvent {
  SendMessage = "sendMessage",
  ReceiveMessage = "receiveMessage",
  EditMessage = "editMessage",
  MessageUpdated = "messageUdpated",
  DeleteMessage = "deleteMessage",
  MessageDeleted = "messageDeleted",
  JoinRoom = "joinRoom",
  ConnectionError = "connect_error",
  Exception = "exception",
}

export enum Room {
  General = "General",
  Tech = "Tech",
  Random = "Random",
}