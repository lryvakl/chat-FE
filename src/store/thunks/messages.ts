import { createAsyncThunk } from '@reduxjs/toolkit';

import type { RootState } from '..';
import { conversationsApi } from '../../api/conversationsApi';
import { decryptGroupMessage } from '../../crypto/groupSession';
import {
  cachePlaintext,
  getCachedForConversation,
} from '../../crypto/messageCache';
import { parseEnvelope } from '../../crypto/messageEnvelope';
import { decryptFromPeer } from '../../crypto/session';
import { ConversationType } from '../../types/enums';
import type { Message, RawIncomingMessage } from '../../types/interfaces';

const decryptHistorySerially = async (
  conversationId: number,
  conversationType: ConversationType,
  peerUserId: number | null,
  myUserId: number | null,
  raw: RawIncomingMessage[],
): Promise<Message[]> => {
  const cached = await getCachedForConversation(conversationId);
  const out: Message[] = [];
  for (const m of raw) {
    const cachedPlaintext = cached.get(m.id);
    if (cachedPlaintext !== undefined) {
      const env = parseEnvelope(cachedPlaintext);
      out.push({
        id: m.id,
        conversationId: m.conversationId,
        text: env.text,
        media: env.media,
        isEncrypted: Boolean(m.isEncrypted),
        senderId: m.senderId,
        senderUsername: m.senderUsername,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
        replyToId: m.replyToId ?? null,
        replyTo: m.replyTo ?? null,
        reactions: m.reactions ?? [],
      });
      continue;
    }
    if (!m.isEncrypted) {
      out.push({
        id: m.id,
        conversationId: m.conversationId,
        text: m.text ?? '',
        isEncrypted: false,
        senderId: m.senderId,
        senderUsername: m.senderUsername,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
        replyToId: m.replyToId ?? null,
        replyTo: m.replyTo ?? null,
        reactions: m.reactions ?? [],
      });
      continue;
    }
    if (m.senderId === myUserId) {
      out.push({
        id: m.id,
        conversationId: m.conversationId,
        text: '[sent]',
        isEncrypted: true,
        senderId: m.senderId,
        senderUsername: m.senderUsername,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
        replyToId: m.replyToId ?? null,
        replyTo: m.replyTo ?? null,
        reactions: m.reactions ?? [],
      });
      continue;
    }
    if (!m.ciphertext || !m.header) {
      out.push({
        id: m.id,
        conversationId: m.conversationId,
        text: '[encrypted: missing payload]',
        isEncrypted: true,
        senderId: m.senderId,
        senderUsername: m.senderUsername,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
        replyToId: m.replyToId ?? null,
        replyTo: m.replyTo ?? null,
        reactions: m.reactions ?? [],
      });
      continue;
    }
    try {
      let plaintext: string;
      if (conversationType === ConversationType.Group) {
        plaintext = await decryptGroupMessage(
          conversationId,
          m.header,
          m.ciphertext,
        );
      } else {
        if (peerUserId === null) throw new Error('DM peer not resolved');
        plaintext = await decryptFromPeer(peerUserId, m.header, m.ciphertext);
      }
      void cachePlaintext(m.id, m.conversationId, plaintext);
      const env = parseEnvelope(plaintext);
      out.push({
        id: m.id,
        conversationId: m.conversationId,
        text: env.text,
        media: env.media,
        isEncrypted: true,
        senderId: m.senderId,
        senderUsername: m.senderUsername,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
        replyToId: m.replyToId ?? null,
        replyTo: m.replyTo ?? null,
        reactions: m.reactions ?? [],
      });
    } catch (err) {
      console.warn(`History decrypt failed for message ${m.id}:`, err);
      out.push({
        id: m.id,
        conversationId: m.conversationId,
        text: '[unable to decrypt]',
        isEncrypted: true,
        senderId: m.senderId,
        senderUsername: m.senderUsername,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
        replyToId: m.replyToId ?? null,
        replyTo: m.replyTo ?? null,
        reactions: m.reactions ?? [],
      });
    }
  }
  return out;
};

export const fetchHistory = createAsyncThunk<
  { conversationId: number; messages: Message[] },
  { conversationId: number; beforeId?: number; limit?: number },
  { state: RootState; rejectValue: string }
>(
  'messages/fetchHistory',
  async (args, { rejectWithValue, getState }) => {
    try {
      const raw = await conversationsApi.history(args.conversationId, {
        beforeId: args.beforeId,
        limit: args.limit,
      });
      const state = getState() as RootState;
      const me = state.auth.user?.id ?? null;
      const conv = state.conversations.byId[args.conversationId];
      const peerUserId =
        conv && conv.type === ConversationType.Dm
          ? (conv.members.find((m) => m.userId !== me)?.userId ?? null)
          : null;

      const messages = await decryptHistorySerially(
        args.conversationId,
        conv?.type ?? ConversationType.Dm,
        peerUserId,
        me,
        raw,
      );
      return { conversationId: args.conversationId, messages };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
  {
    condition: (arg, { getState }) => {
      const state = getState();
      return !state.messages.loadingByConversation[arg.conversationId];
    },
  },
);
