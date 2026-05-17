import type { Socket } from 'socket.io-client';

import { SocketEvent } from '../../types/enums';

export const chatClient = {
  joinConversation(socket: Socket, conversationId: number) {
    socket.emit(SocketEvent.JoinConversation, { conversationId });
  },
  leaveConversation(socket: Socket, conversationId: number) {
    socket.emit(SocketEvent.LeaveConversation, { conversationId });
  },
  sendMessage(
    socket: Socket,
    conversationId: number,
    text: string,
    replyToId?: number | null,
  ) {
    socket.emit(SocketEvent.SendMessage, {
      conversationId,
      text,
      ...(replyToId ? { replyToId } : {}),
    });
  },
  sendEncryptedMessage(
    socket: Socket,
    conversationId: number,
    ciphertext: string,
    header: string,
    replyToId?: number | null,
  ) {
    socket.emit(SocketEvent.SendMessage, {
      conversationId,
      ciphertext,
      header,
      isEncrypted: true,
      ...(replyToId ? { replyToId } : {}),
    });
  },
  addReaction(
    socket: Socket,
    conversationId: number,
    messageId: number,
    emoji: string,
  ) {
    socket.emit(SocketEvent.AddReaction, {
      conversationId,
      messageId,
      emoji,
    });
  },
  removeReaction(
    socket: Socket,
    conversationId: number,
    messageId: number,
    emoji: string,
  ) {
    socket.emit(SocketEvent.RemoveReaction, {
      conversationId,
      messageId,
      emoji,
    });
  },
  editMessage(
    socket: Socket,
    conversationId: number,
    messageId: number,
    text: string,
  ) {
    socket.emit(SocketEvent.EditMessage, { conversationId, messageId, text });
  },
  editEncryptedMessage(
    socket: Socket,
    conversationId: number,
    messageId: number,
    ciphertext: string,
    header: string,
  ) {
    socket.emit(SocketEvent.EditMessage, {
      conversationId,
      messageId,
      ciphertext,
      header,
      isEncrypted: true,
    });
  },
  deleteMessage(socket: Socket, conversationId: number, messageId: number) {
    socket.emit(SocketEvent.DeleteMessage, { conversationId, messageId });
  },
  typing(socket: Socket, conversationId: number) {
    socket.emit(SocketEvent.Typing, { conversationId });
  },
  stopTyping(socket: Socket, conversationId: number) {
    socket.emit(SocketEvent.StopTyping, { conversationId });
  },
  markRead(socket: Socket, conversationId: number, upToMessageId: number) {
    socket.emit(SocketEvent.MessageRead, { conversationId, upToMessageId });
  },
  requestSessionReset(socket: Socket, peerUserId: number) {
    socket.emit(SocketEvent.RequestSessionReset, { peerUserId });
  },
  sendSenderKeyDistribution(
    socket: Socket,
    conversationId: number,
    recipientUserId: number,
    ciphertext: string,
    header: string,
  ) {
    socket.emit(SocketEvent.SenderKeyDistribution, {
      conversationId,
      recipientUserId,
      ciphertext,
      header,
    });
  },
};
