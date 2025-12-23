export enum SocketEvent {
  SendMessage = "sendMessage",
  ReceiveMessage = "receiveMessage",
  EditMessage = "editMessage",
  MessageUpdated = "messageUpdated",
  DeleteMessage = "deleteMessage",
  MessageDeleted = "messageDeleted",
  JoinRoom = "joinRoom",
  LeaveRoom = "leaveRoom",
  ConnectionError = "connect_error",
  Exception = "exception",
}

export enum Room {
  General = "General",
  Tech = "Tech",
  Random = "Random",
}
