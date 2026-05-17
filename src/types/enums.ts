export enum SocketEvent {
  SendMessage = "sendMessage",
  ReceiveMessage = "receiveMessage",
  EditMessage = "editMessage",
  MessageUpdated = "messageUpdated",
  DeleteMessage = "deleteMessage",
  MessageDeleted = "messageDeleted",
  JoinConversation = "joinConversation",
  LeaveConversation = "leaveConversation",
  Typing = "typing",
  StopTyping = "stopTyping",
  MessageRead = "messageRead",
  PresenceUpdate = "presenceUpdate",
  SenderKeyDistribution = "senderKeyDistribution",
  ReceiveSenderKeyDistribution = "receiveSenderKeyDistribution",
  RequestSessionReset = "requestSessionReset",
  PeerRequestedSessionReset = "peerRequestedSessionReset",
  ConversationCreated = "conversationCreated",
  ConversationUpdated = "conversationUpdated",
  ConversationMemberAdded = "conversationMemberAdded",
  ConversationMemberRemoved = "conversationMemberRemoved",
  UserProfileUpdated = "userProfileUpdated",
  ConnectionError = "connect_error",
  Exception = "exception",
  AddReaction = "addReaction",
  RemoveReaction = "removeReaction",
  ReactionUpdated = "reactionUpdated",
}

export enum PATHS {
  CHAT = "/chat",
  LOGIN = "/login",
  REGISTER = "/register",
}

export enum ConversationType {
  Dm = "dm",
  Group = "group",
}

export enum ConversationRole {
  Owner = "owner",
  Admin = "admin",
  Member = "member",
}

export enum PresenceStatus {
  Online = "online",
  Offline = "offline",
}
