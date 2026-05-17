import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  distributeSenderKeyToMembers,
  encryptForGroup,
  ensureMySenderKey,
} from '../crypto/groupSession';
import {
  encodeEnvelope,
  type MediaAttachment,
} from '../crypto/messageEnvelope';
import { pushOutgoing } from '../crypto/outboxCache';
import { encryptForPeer } from '../crypto/session';
import type { AppDispatch, RootState } from '../store';
import { fetchHistory } from '../store/thunks/messages';
import { ConversationType } from '../types/enums';
import { chatClient } from '../websockets/services/chatClient';
import { socketService } from '../websockets/services/WebSocketManager';

const TYPING_DEBOUNCE = 1500;
const EMPTY_MESSAGES: never[] = [];

export const useChat = (conversationId: number | null) => {
  const dispatch = useDispatch<AppDispatch>();
  const socket = socketService.rawSocket;
  const myUserId = useSelector((s: RootState) => s.auth.user?.id ?? null);
  const conversation = useSelector((s: RootState) =>
    conversationId ? s.conversations.byId[conversationId] : null,
  );

  const messages = useSelector((s: RootState) =>
    conversationId
      ? (s.messages.byConversation[conversationId] ?? EMPTY_MESSAGES)
      : EMPTY_MESSAGES,
  );
  const isLoadingHistory = useSelector((s: RootState) =>
    conversationId
      ? Boolean(s.messages.loadingByConversation[conversationId])
      : false,
  );

  useEffect(() => {
    if (!conversationId) return;
    chatClient.joinConversation(socket, conversationId);
    dispatch(fetchHistory({ conversationId }));
  }, [conversationId, socket, dispatch]);

  const typingState = useRef({
    isTyping: false,
    timer: null as number | null,
  });

  const emitStopTyping = useCallback(() => {
    if (!conversationId) return;
    if (typingState.current.isTyping) {
      typingState.current.isTyping = false;
      chatClient.stopTyping(socket, conversationId);
    }
    if (typingState.current.timer) {
      window.clearTimeout(typingState.current.timer);
      typingState.current.timer = null;
    }
  }, [conversationId, socket]);

  const onLocalTyping = useCallback(() => {
    if (!conversationId) return;
    if (!typingState.current.isTyping) {
      typingState.current.isTyping = true;
      chatClient.typing(socket, conversationId);
    }
    if (typingState.current.timer) {
      window.clearTimeout(typingState.current.timer);
    }
    typingState.current.timer = window.setTimeout(() => {
      typingState.current.isTyping = false;
      chatClient.stopTyping(socket, conversationId);
      typingState.current.timer = null;
    }, TYPING_DEBOUNCE);
  }, [conversationId, socket]);

  const sendMessage = useCallback(
    async (
      text: string,
      media?: MediaAttachment,
      replyToId?: number | null,
    ) => {
      if (!conversationId) return;
      const trimmed = text.trim();
      if (!trimmed && !media) return;
      emitStopTyping();

      const envelope = encodeEnvelope({ v: 1, text: trimmed, media });

      if (conversation && myUserId !== null) {
        if (conversation.type === ConversationType.Dm) {
          const peer = conversation.members.find((m) => m.userId !== myUserId);
          if (peer) {
            try {
              const out = await encryptForPeer(peer.userId, envelope);
              pushOutgoing(conversationId, envelope);
              chatClient.sendEncryptedMessage(
                socket,
                conversationId,
                out.ciphertext,
                out.header,
                replyToId,
              );
              return;
            } catch (err) {
              console.error('DM encryption failed; aborting send:', err);
              return;
            }
          }
        } else if (conversation.type === ConversationType.Group) {
          try {
            await ensureMySenderKey(conversationId);
            const memberIds = conversation.members.map((m) => m.userId);
            const distributions = await distributeSenderKeyToMembers(
              conversationId,
              myUserId,
              memberIds,
            );
            for (const d of distributions) {
              chatClient.sendSenderKeyDistribution(
                socket,
                conversationId,
                d.recipientUserId,
                d.ciphertext,
                d.header,
              );
            }
            const out = await encryptForGroup(
              conversationId,
              myUserId,
              envelope,
            );
            pushOutgoing(conversationId, envelope);
            chatClient.sendEncryptedMessage(
              socket,
              conversationId,
              out.ciphertext,
              out.header,
            );
            return;
          } catch (err) {
            console.error('Group encryption failed; aborting send:', err);
            return;
          }
        }
      }
      chatClient.sendMessage(socket, conversationId, trimmed, replyToId);
    },
    [conversationId, socket, emitStopTyping, conversation, myUserId],
  );

  const toggleReaction = useCallback(
    (messageId: number, emoji: string, mine: boolean) => {
      if (!conversationId) return;
      if (mine) {
        chatClient.removeReaction(socket, conversationId, messageId, emoji);
      } else {
        chatClient.addReaction(socket, conversationId, messageId, emoji);
      }
    },
    [conversationId, socket],
  );

  const editMessage = useCallback(
    async (messageId: number, text: string) => {
      if (!conversationId) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const envelope = encodeEnvelope({ v: 1, text: trimmed });

      if (conversation && myUserId !== null) {
        if (conversation.type === ConversationType.Dm) {
          const peer = conversation.members.find((m) => m.userId !== myUserId);
          if (peer) {
            try {
              const out = await encryptForPeer(peer.userId, envelope);
              pushOutgoing(conversationId, envelope);
              chatClient.editEncryptedMessage(
                socket,
                conversationId,
                messageId,
                out.ciphertext,
                out.header,
              );
              return;
            } catch (err) {
              console.error('DM encryption failed; aborting edit:', err);
              return;
            }
          }
        } else if (conversation.type === ConversationType.Group) {
          try {
            await ensureMySenderKey(conversationId);
            const memberIds = conversation.members.map((m) => m.userId);
            const distributions = await distributeSenderKeyToMembers(
              conversationId,
              myUserId,
              memberIds,
            );
            for (const d of distributions) {
              chatClient.sendSenderKeyDistribution(
                socket,
                conversationId,
                d.recipientUserId,
                d.ciphertext,
                d.header,
              );
            }
            const out = await encryptForGroup(
              conversationId,
              myUserId,
              envelope,
            );
            pushOutgoing(conversationId, envelope);
            chatClient.editEncryptedMessage(
              socket,
              conversationId,
              messageId,
              out.ciphertext,
              out.header,
            );
            return;
          } catch (err) {
            console.error('Group encryption failed; aborting edit:', err);
            return;
          }
        }
      }
      chatClient.editMessage(socket, conversationId, messageId, trimmed);
    },
    [conversationId, socket, conversation, myUserId],
  );

  const deleteMessage = useCallback(
    (messageId: number) => {
      if (!conversationId) return;
      chatClient.deleteMessage(socket, conversationId, messageId);
    },
    [conversationId, socket],
  );

  const markRead = useCallback(
    (messageId: number) => {
      if (!conversationId) return;
      chatClient.markRead(socket, conversationId, messageId);
    },
    [conversationId, socket],
  );

  return useMemo(
    () => ({
      messages,
      isLoadingHistory,
      sendMessage,
      editMessage,
      deleteMessage,
      onLocalTyping,
      stopTyping: emitStopTyping,
      markRead,
      toggleReaction,
    }),
    [
      messages,
      isLoadingHistory,
      sendMessage,
      editMessage,
      deleteMessage,
      onLocalTyping,
      emitStopTyping,
      markRead,
      toggleReaction,
    ],
  );
};
