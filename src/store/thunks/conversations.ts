import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  conversationsApi,
  type CreateGroupPayload,
  type UpdateConversationPayload,
  type UpdateMembershipPayload,
} from '../../api/conversationsApi';
import {
  rotateMySenderKey,
  wipeGroupSenderKeys,
} from '../../crypto/groupSession';
import { getCachedPlaintext } from '../../crypto/messageCache';
import { parseEnvelope } from '../../crypto/messageEnvelope';
import type { Conversation } from '../../types/interfaces';

const recoverPreview = async (conv: Conversation): Promise<Conversation> => {
  const last = conv.lastMessage;
  if (!last) return conv;
  if (typeof last.text === 'string' && last.text.length > 0) return conv;
  if (!last.isEncrypted) return conv;
  try {
    const cached = await getCachedPlaintext(last.id);
    if (!cached) {
      return {
        ...conv,
        lastMessage: { ...last, text: '🔒 Encrypted message' },
      };
    }
    const env = parseEnvelope(cached);
    const text = env.text || (env.media ? '📎 Media' : '🔒 Encrypted message');
    return { ...conv, lastMessage: { ...last, text } };
  } catch {
    return { ...conv, lastMessage: { ...last, text: '🔒 Encrypted message' } };
  }
};

export const fetchConversations = createAsyncThunk(
  'conversations/fetchAll',
  async (_arg, { rejectWithValue }) => {
    try {
      const list = await conversationsApi.list();
      return await Promise.all(list.map(recoverPreview));
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const fetchConversation = createAsyncThunk(
  'conversations/fetchOne',
  async (id: number, { rejectWithValue }) => {
    try {
      return await conversationsApi.getOne(id);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const openDm = createAsyncThunk(
  'conversations/createDm',
  async (peerId: number, { rejectWithValue }) => {
    try {
      return await conversationsApi.createDm(peerId);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const createGroup = createAsyncThunk(
  'conversations/createGroup',
  async (payload: CreateGroupPayload, { rejectWithValue }) => {
    try {
      return await conversationsApi.createGroup(payload);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const updateConversation = createAsyncThunk(
  'conversations/update',
  async (
    args: { conversationId: number; payload: UpdateConversationPayload },
    { rejectWithValue },
  ) => {
    try {
      return await conversationsApi.update(args.conversationId, args.payload);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const updateMembership = createAsyncThunk(
  'conversations/updateMembership',
  async (
    args: { conversationId: number; payload: UpdateMembershipPayload },
    { rejectWithValue },
  ) => {
    try {
      return await conversationsApi.updateMembership(
        args.conversationId,
        args.payload,
      );
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const addMember = createAsyncThunk(
  'conversations/addMember',
  async (
    args: { conversationId: number; userId: number; selfUserId?: number },
    { rejectWithValue },
  ) => {
    try {
      const result = await conversationsApi.addMember(
        args.conversationId,
        args.userId,
      );
      try {
        await rotateMySenderKey(args.conversationId);
      } catch (cryptoErr) {
        console.warn('Sender key rotation after add failed:', cryptoErr);
      }
      return result;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const removeMember = createAsyncThunk(
  'conversations/removeMember',
  async (
    args: { conversationId: number; userId: number; selfUserId?: number },
    { rejectWithValue },
  ) => {
    try {
      await conversationsApi.removeMember(args.conversationId, args.userId);
      try {
        if (args.selfUserId !== undefined && args.userId === args.selfUserId) {
          await wipeGroupSenderKeys(args.conversationId);
        } else {
          await rotateMySenderKey(args.conversationId);
        }
      } catch (cryptoErr) {
        console.warn('Sender key rotation after remove failed:', cryptoErr);
      }
      return args;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);
