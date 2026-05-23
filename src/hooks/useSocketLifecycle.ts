import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { pendingSenderKeysApi } from '../api/pendingSenderKeysApi';
import {
  decryptGroupMessage,
  distributeSenderKeyToMembers,
  ingestDistribution,
} from '../crypto/groupSession';
import {
  deleteSession,
  loadMySenderKey,
  persistVault,
  saveMySenderKey,
} from '../crypto/keyStore';
import {
  cachePlaintext,
  getCachedPlaintext,
  removeCached,
} from '../crypto/messageCache';
import { parseEnvelope } from '../crypto/messageEnvelope';
import { popOutgoing } from '../crypto/outboxCache';
import { shouldResetPeer } from '../crypto/resetCooldown';
import { decryptFromPeer } from '../crypto/session';
import type { AppDispatch, RootState } from '../store';
import { store } from '../store';
import { profileUpdated } from '../store/authSlice';
import {
  applyMemberProfile,
  removeMemberFromConversation,
  setLastMessage,
  updateLastReadForMe,
  upsertConversation,
} from '../store/conversationsSlice';
import { applyReactions } from '../store/messagesSlice';
import { markDeleted, upsertMessage } from '../store/messagesSlice';
import {
  applyPresence,
  applyRead,
  applyTyping,
  clearTyping,
  pruneExpiredTyping,
} from '../store/presenceSlice';
import { fetchHistory } from '../store/thunks/messages';
import { ConversationType, SocketEvent } from '../types/enums';
import type {
  ConversationDetails,
  Message,
  MessageDeletedPayload,
  PresencePayload,
  RawIncomingMessage,
  ReadReceiptPayload,
  ServerError,
  TypingPayload,
} from '../types/interfaces';
import type { ReactionUpdatedPayload } from '../types/interfaces';
import { chatClient } from '../websockets/services/chatClient';
import { socketService } from '../websockets/services/WebSocketManager';

const resolveDmPeer = (
  conversationId: number,
  selfUserId: number,
): number | null => {
  const conv = store.getState().conversations.byId[conversationId];
  if (!conv || conv.type !== ConversationType.Dm) return null;
  const peer = conv.members.find((m) => m.userId !== selfUserId);
  return peer?.userId ?? null;
};

const isGroupConversation = (conversationId: number): boolean => {
  const conv = store.getState().conversations.byId[conversationId];
  return conv?.type === ConversationType.Group;
};

const normalizeIncoming = async (
  raw: RawIncomingMessage,
  selfUserId: number,
): Promise<Message> => {
  if (!raw.isEncrypted) {
    return {
      id: raw.id,
      conversationId: raw.conversationId,
      text: raw.text ?? '',
      isEncrypted: false,
      senderId: raw.senderId,
      senderUsername: raw.senderUsername,
      createdAt: raw.createdAt,
      editedAt: raw.editedAt,
    };
  }
  if (raw.senderId === selfUserId) {
    const cachedFromStore = await getCachedPlaintext(raw.id);
    if (cachedFromStore !== null) {
      const env = parseEnvelope(cachedFromStore);
      return {
        id: raw.id,
        conversationId: raw.conversationId,
        text: env.text,
        media: env.media,
        isEncrypted: true,
        senderId: raw.senderId,
        senderUsername: raw.senderUsername,
        createdAt: raw.createdAt,
        editedAt: raw.editedAt,
      };
    }
    const fromOutbox = popOutgoing(raw.conversationId);
    const env = fromOutbox
      ? parseEnvelope(fromOutbox)
      : { v: 1 as const, text: '[sent]' };
    if (fromOutbox !== null) {
      void cachePlaintext(raw.id, raw.conversationId, fromOutbox);
    }
    return {
      id: raw.id,
      conversationId: raw.conversationId,
      text: env.text,
      media: env.media,
      isEncrypted: true,
      senderId: raw.senderId,
      senderUsername: raw.senderUsername,
      createdAt: raw.createdAt,
      editedAt: raw.editedAt,
    };
  }

  {
    const cached = await getCachedPlaintext(raw.id);
    if (cached !== null) {
      const env = parseEnvelope(cached);
      return {
        id: raw.id,
        conversationId: raw.conversationId,
        text: env.text,
        media: env.media,
        isEncrypted: true,
        senderId: raw.senderId,
        senderUsername: raw.senderUsername,
        createdAt: raw.createdAt,
        editedAt: raw.editedAt,
      };
    }
  }
  if (!raw.ciphertext || !raw.header) {
    return {
      id: raw.id,
      conversationId: raw.conversationId,
      text: '[unable to decrypt: missing payload]',
      isEncrypted: true,
      senderId: raw.senderId,
      senderUsername: raw.senderUsername,
      createdAt: raw.createdAt,
      editedAt: raw.editedAt,
    };
  }

  try {
    let plaintext: string;
    if (isGroupConversation(raw.conversationId)) {
      plaintext = await decryptGroupMessage(
        raw.conversationId,
        raw.header,
        raw.ciphertext,
      );
    } else {
      const peerId = resolveDmPeer(raw.conversationId, selfUserId);
      if (peerId === null) throw new Error('Peer not found');
      plaintext = await decryptFromPeer(peerId, raw.header, raw.ciphertext);
    }
    void cachePlaintext(raw.id, raw.conversationId, plaintext);
    const env = parseEnvelope(plaintext);
    return {
      id: raw.id,
      conversationId: raw.conversationId,
      text: env.text,
      media: env.media,
      isEncrypted: true,
      senderId: raw.senderId,
      senderUsername: raw.senderUsername,
      createdAt: raw.createdAt,
      editedAt: raw.editedAt,
    };
  } catch (err) {
    console.error('Decrypt failed:', err);
    void store.dispatch(fetchHistory({ conversationId: raw.conversationId }));
    const errMsg = err instanceof Error ? err.message : String(err);
    const isAead = errMsg.toLowerCase().includes('cannot be decrypted');
    const isAwaitingDistribution = errMsg.includes('awaiting distribution');
    if (isAead && !isGroupConversation(raw.conversationId)) {
      const peerId = resolveDmPeer(raw.conversationId, selfUserId);
      if (peerId !== null && shouldResetPeer(peerId)) {
        try {
          deleteSession(peerId);
          await persistVault();
          chatClient.requestSessionReset(socketService.rawSocket, peerId);
        } catch (resetErr) {
          console.warn('Local session reset failed:', resetErr);
        }
      }
    } else if (
      isAwaitingDistribution &&
      isGroupConversation(raw.conversationId)
    ) {
      if (raw.senderId != null && shouldResetPeer(raw.senderId)) {
        chatClient.requestSessionReset(socketService.rawSocket, raw.senderId);
      }
    }
    return {
      id: raw.id,
      conversationId: raw.conversationId,
      text: '[unable to decrypt yet — catching up…]',
      isEncrypted: true,
      senderId: raw.senderId,
      senderUsername: raw.senderUsername,
      createdAt: raw.createdAt,
      editedAt: raw.editedAt,
    };
  }
};

export const useSocketLifecycle = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!token || !userId) return;
    socketService.connect(token);
    const socket = socketService.rawSocket;
    const myId = userId;

    const enrich = (raw: RawIncomingMessage, msg: Message): Message => ({
      ...msg,
      replyToId: raw.replyToId ?? null,
      replyTo: raw.replyTo ?? null,
      reactions: raw.reactions ?? [],
    });

    const onReceive = async (raw: RawIncomingMessage) => {
      const msg = enrich(raw, await normalizeIncoming(raw, myId));
      dispatch(upsertMessage(msg));
      dispatch(
        setLastMessage({
          conversationId: msg.conversationId,
          message: msg,
          myUserId: myId,
        }),
      );
      if (msg.senderId === myId) {
        dispatch(
          updateLastReadForMe({
            conversationId: msg.conversationId,
            messageId: msg.id,
          }),
        );
      }
    };
    const onUpdated = async (raw: RawIncomingMessage) => {
      if (raw.isEncrypted) {
        await removeCached(raw.id);
      }
      const msg = enrich(raw, await normalizeIncoming(raw, myId));
      dispatch(upsertMessage(msg));
    };
    const onDeleted = (p: MessageDeletedPayload) => {
      dispatch(markDeleted(p));
    };
    const onTyping = (p: TypingPayload) => {
      dispatch(applyTyping(p));
    };
    const onStopTyping = (p: { conversationId: number; userId: number }) => {
      dispatch(clearTyping(p));
    };
    const onRead = (p: ReadReceiptPayload) => {
      dispatch(applyRead(p));
      if (p.userId === myId) {
        dispatch(
          updateLastReadForMe({
            conversationId: p.conversationId,
            messageId: p.lastReadMessageId,
          }),
        );
      }
    };
    const onPresence = (p: PresencePayload) => {
      dispatch(applyPresence(p));
    };
    const recoverFromBrokenSession = async (senderUserId: number) => {
      if (!shouldResetPeer(senderUserId)) return;
      try {
        deleteSession(senderUserId);
        await persistVault();
        chatClient.requestSessionReset(socket, senderUserId);
      } catch (resetErr) {
        console.warn('Local session reset failed:', resetErr);
      }
    };

    const onSenderKey = async (p: {
      id?: number;
      conversationId: number;
      senderUserId: number;
      ciphertext: string;
      header: string;
    }) => {
      try {
        await ingestDistribution(p.senderUserId, p.header, p.ciphertext);
        if (typeof p.id === 'number') {
          await pendingSenderKeysApi.ack([p.id]);
        }
        dispatch(fetchHistory({ conversationId: p.conversationId }));
      } catch (err) {
        console.error('Sender-key ingestion failed:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.toLowerCase().includes('cannot be decrypted')) {
          if (typeof p.id === 'number') {
            try {
              await pendingSenderKeysApi.ack([p.id]);
            } catch (ackErr) {
              console.warn('Failed to ack bad pending sender key:', ackErr);
            }
          }
          await recoverFromBrokenSession(p.senderUserId);
        }
      }
    };
    const onPeerResetRequest = async (p: { requesterUserId: number }) => {
      try {
        deleteSession(p.requesterUserId);
        const state = store.getState();
        const groupsToRedistribute: number[] = [];
        for (const conv of Object.values(state.conversations.byId)) {
          if (conv.type !== ConversationType.Group) continue;
          const isMember = conv.members.some(
            (m) => m.userId === p.requesterUserId,
          );
          if (!isMember) continue;
          const mine = loadMySenderKey(conv.id);
          if (!mine) continue;
          if (mine.distributedTo.includes(p.requesterUserId)) {
            saveMySenderKey({
              ...mine,
              distributedTo: mine.distributedTo.filter(
                (uid) => uid !== p.requesterUserId,
              ),
            });
            groupsToRedistribute.push(conv.id);
          }
        }
        await persistVault();
        for (const convId of groupsToRedistribute) {
          try {
            const distributions = await distributeSenderKeyToMembers(
              convId,
              myId,
              [p.requesterUserId],
            );
            for (const d of distributions) {
              chatClient.sendSenderKeyDistribution(
                socket,
                convId,
                d.recipientUserId,
                d.ciphertext,
                d.header,
              );
            }
          } catch (redistErr) {
            console.warn(
              `Sender key redistribution failed for conv ${convId}:`,
              redistErr,
            );
          }
        }
      } catch (err) {
        console.error('Peer reset request handling failed:', err);
      }
    };
    const onError = (err: Error | ServerError) => {
      console.error('Socket error:', err);
    };

    const onReactionUpdated = (p: ReactionUpdatedPayload) => {
      dispatch(applyReactions(p));
    };

    const onConversationCreated = (p: ConversationDetails) => {
      dispatch(upsertConversation(p));
    };
    const onConversationUpdated = (p: ConversationDetails) => {
      dispatch(upsertConversation(p));
    };
    const onConversationMemberAdded = (p: ConversationDetails) => {
      dispatch(upsertConversation(p));
    };
    const onUserProfileUpdated = (p: {
      userId: number;
      profile: import('../types/interfaces').UserProfile;
    }) => {
      dispatch(applyMemberProfile({ userId: p.userId, profile: p.profile }));
      if (p.userId === myId) {
        dispatch(profileUpdated(p.profile));
      }
    };

    const onConversationMemberRemoved = (p: {
      conversationId: number;
      userId: number;
    }) => {
      dispatch(
        removeMemberFromConversation({
          conversationId: p.conversationId,
          userId: p.userId,
          selfUserId: myId,
        }),
      );
    };

    socket.on(SocketEvent.ReactionUpdated, onReactionUpdated);
    socket.on(SocketEvent.ConversationCreated, onConversationCreated);
    socket.on(SocketEvent.ConversationUpdated, onConversationUpdated);
    socket.on(SocketEvent.ConversationMemberAdded, onConversationMemberAdded);
    socket.on(
      SocketEvent.ConversationMemberRemoved,
      onConversationMemberRemoved,
    );
    socket.on(SocketEvent.UserProfileUpdated, onUserProfileUpdated);
    socket.on(SocketEvent.ReceiveMessage, onReceive);
    socket.on(SocketEvent.MessageUpdated, onUpdated);
    socket.on(SocketEvent.MessageDeleted, onDeleted);
    socket.on(SocketEvent.Typing, onTyping);
    socket.on(SocketEvent.StopTyping, onStopTyping);
    socket.on(SocketEvent.MessageRead, onRead);
    socket.on(SocketEvent.PresenceUpdate, onPresence);
    socket.on(SocketEvent.ReceiveSenderKeyDistribution, onSenderKey);
    socket.on(SocketEvent.PeerRequestedSessionReset, onPeerResetRequest);
    socket.on(SocketEvent.ConnectionError, onError);
    socket.on(SocketEvent.Exception, onError);

    void (async () => {
      try {
        const pending = await pendingSenderKeysApi.list();
        const ackIds: number[] = [];
        const unlockedConversationIds = new Set<number>();
        const peersToReset = new Set<number>();
        for (const p of pending) {
          try {
            await ingestDistribution(p.senderUserId, p.header, p.ciphertext);
            ackIds.push(p.id);
            unlockedConversationIds.add(p.conversationId);
          } catch (err) {
            console.warn(`Failed to ingest pending sender key ${p.id}:`, err);
            const errMsg = err instanceof Error ? err.message : String(err);
            if (errMsg.toLowerCase().includes('cannot be decrypted')) {
              ackIds.push(p.id);
              peersToReset.add(p.senderUserId);
            }
          }
        }
        for (const peerId of peersToReset) {
          await recoverFromBrokenSession(peerId);
        }
        if (ackIds.length > 0) {
          await pendingSenderKeysApi.ack(ackIds);
        }
        for (const conversationId of unlockedConversationIds) {
          dispatch(fetchHistory({ conversationId }));
        }
      } catch (err) {
        console.warn('Pending sender-key catch-up failed:', err);
      }
    })();

    const tick = window.setInterval(() => {
      dispatch(pruneExpiredTyping());
    }, 1500);

    return () => {
      window.clearInterval(tick);
      socket.off(SocketEvent.ReactionUpdated, onReactionUpdated);
      socket.off(SocketEvent.ConversationCreated, onConversationCreated);
      socket.off(SocketEvent.ConversationUpdated, onConversationUpdated);
      socket.off(
        SocketEvent.ConversationMemberAdded,
        onConversationMemberAdded,
      );
      socket.off(
        SocketEvent.ConversationMemberRemoved,
        onConversationMemberRemoved,
      );
      socket.off(SocketEvent.UserProfileUpdated, onUserProfileUpdated);
      socket.off(SocketEvent.ReceiveMessage, onReceive);
      socket.off(SocketEvent.MessageUpdated, onUpdated);
      socket.off(SocketEvent.MessageDeleted, onDeleted);
      socket.off(SocketEvent.Typing, onTyping);
      socket.off(SocketEvent.StopTyping, onStopTyping);
      socket.off(SocketEvent.MessageRead, onRead);
      socket.off(SocketEvent.PresenceUpdate, onPresence);
      socket.off(SocketEvent.ReceiveSenderKeyDistribution, onSenderKey);
      socket.off(SocketEvent.PeerRequestedSessionReset, onPeerResetRequest);
      socket.off(SocketEvent.ConnectionError, onError);
      socket.off(SocketEvent.Exception, onError);
      socketService.disconnect();
    };
  }, [dispatch, token, userId]);
};
