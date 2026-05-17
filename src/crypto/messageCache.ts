import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'chat-msg-cache';
const DB_VERSION = 1;
const STORE = 'plaintexts';

interface CachedPlaintext {
  id: number;
  conversationId: number;
  plaintext: string;
  cachedAt: number;
}

const db = async (): Promise<IDBPDatabase> =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('byConversation', 'conversationId');
      }
    },
  });

export const cachePlaintext = async (
  id: number,
  conversationId: number,
  plaintext: string,
): Promise<void> => {
  const database = await db();
  await database.put(STORE, {
    id,
    conversationId,
    plaintext,
    cachedAt: Date.now(),
  } satisfies CachedPlaintext);
};

export const getCachedPlaintext = async (
  id: number,
): Promise<string | null> => {
  const database = await db();
  const row = (await database.get(STORE, id)) as CachedPlaintext | undefined;
  return row?.plaintext ?? null;
};

export const getCachedForConversation = async (
  conversationId: number,
): Promise<Map<number, string>> => {
  const database = await db();
  const rows = (await database.getAllFromIndex(
    STORE,
    'byConversation',
    conversationId,
  )) as CachedPlaintext[];
  const map = new Map<number, string>();
  for (const r of rows) map.set(r.id, r.plaintext);
  return map;
};

export const removeCached = async (id: number): Promise<void> => {
  const database = await db();
  await database.delete(STORE, id);
};

export const wipeCache = async (): Promise<void> => {
  const database = await db();
  await database.clear(STORE);
};
