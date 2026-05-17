import { openDB, type IDBPDatabase } from 'idb';

import { concat, fromB64, fromUtf8, toB64, utf8 } from './encoding';
import type { IdentityBundle, KeyPair } from './identity';
import type { SessionJson } from './ratchet';
import type { MySenderKeyJson, PeerSenderKeyJson } from './senderKeys';
import { getSodium } from './sodium';

const DB_NAME = 'chat-keystore';
const STORE = 'vault';
const VAULT_KEY = 'identity-vault';

interface StoredVault {
  version: 1;
  userId: number;
  username: string;
  kdfSalt: string;
  kdfOps: number;
  kdfMem: number;
  ciphertext: string;
  nonce: string;
}

interface VaultPlaintext {
  registrationId: number;
  identity: { publicKey: string; privateKey: string };
  signedPreKey: {
    keyId: number;
    publicKey: string;
    privateKey: string;
    signature: string;
  };
  oneTimePreKeys: Array<{
    keyId: number;
    publicKey: string;
    privateKey: string;
  }>;

  sessions: Record<string, SessionJson>;
  mySenderKeys?: Record<string, MySenderKeyJson>;
  peerSenderKeys?: Record<string, PeerSenderKeyJson>;
}

let cached: VaultPlaintext | null = null;
let cachedUserId: number | null = null;
let cachedKek: Uint8Array | null = null;

const db = async (): Promise<IDBPDatabase> =>
  openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE);
      }
    },
  });

const deriveKek = async (
  password: string,
  salt: Uint8Array,
  ops: number,
  mem: number,
): Promise<Uint8Array> => {
  const s = await getSodium();
  if (!password) throw new Error('Vault password is required');
  if (!salt || salt.length === 0) throw new Error('KDF salt missing');
  const algo = s.crypto_pwhash_ALG_ARGON2ID13 ?? 2;
  return s.crypto_pwhash(32, password, salt, ops, mem, algo);
};

const aeadEncrypt = async (
  kek: Uint8Array,
  plaintext: Uint8Array,
  ad: Uint8Array,
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> => {
  const s = await getSodium();
  const nonceLen = s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES ?? 24;
  const nonce = s.randombytes_buf(nonceLen);
  const ciphertext = s.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    ad,
    null,
    nonce,
    kek,
  );
  return { ciphertext, nonce };
};

const aeadDecrypt = async (
  kek: Uint8Array,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  ad: Uint8Array,
): Promise<Uint8Array> => {
  const s = await getSodium();
  return s.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    ad,
    nonce,
    kek,
  );
};

export const hasVault = async (userId: number): Promise<boolean> => {
  const database = await db();
  const raw = (await database.get(STORE, VAULT_KEY)) as StoredVault | undefined;
  return Boolean(raw && raw.userId === userId);
};

export const createVault = async (
  userId: number,
  username: string,
  password: string,
  bundle: IdentityBundle,
): Promise<void> => {
  const s = await getSodium();
  const saltLen = s.crypto_pwhash_SALTBYTES ?? 16;
  const kdfSalt = s.randombytes_buf(saltLen);
  const ops = s.crypto_pwhash_OPSLIMIT_INTERACTIVE ?? 2;
  const mem = s.crypto_pwhash_MEMLIMIT_INTERACTIVE ?? 67108864;
  const kek = await deriveKek(password, kdfSalt, ops, mem);

  const plaintext: VaultPlaintext = {
    registrationId: bundle.registrationId,
    identity: {
      publicKey: await toB64(bundle.identity.publicKey),
      privateKey: await toB64(bundle.identity.privateKey),
    },
    signedPreKey: {
      keyId: bundle.signedPreKey.keyId,
      publicKey: await toB64(bundle.signedPreKey.keyPair.publicKey),
      privateKey: await toB64(bundle.signedPreKey.keyPair.privateKey),
      signature: await toB64(bundle.signedPreKey.signature),
    },
    oneTimePreKeys: await Promise.all(
      bundle.oneTimePreKeys.map(async (k) => ({
        keyId: k.keyId,
        publicKey: await toB64(k.keyPair.publicKey),
        privateKey: await toB64(k.keyPair.privateKey),
      })),
    ),
    sessions: {},
  };

  const ad = utf8(`vault:v1:user:${userId}`);
  const { ciphertext, nonce } = await aeadEncrypt(
    kek,
    utf8(JSON.stringify(plaintext)),
    ad,
  );

  const stored: StoredVault = {
    version: 1,
    userId,
    username,
    kdfSalt: await toB64(kdfSalt),
    kdfOps: ops,
    kdfMem: mem,
    ciphertext: await toB64(ciphertext),
    nonce: await toB64(nonce),
  };
  const database = await db();
  await database.put(STORE, stored, VAULT_KEY);
  cached = plaintext;
  cachedUserId = userId;
  cachedKek = kek;
};

export const unlockVault = async (
  userId: number,
  password: string,
): Promise<VaultPlaintext> => {
  if (cached && cachedUserId === userId) return cached;
  const database = await db();
  const raw = (await database.get(STORE, VAULT_KEY)) as StoredVault | undefined;
  if (!raw || raw.userId !== userId) {
    throw new Error('Vault not found for this user');
  }
  const kek = await deriveKek(
    password,
    await fromB64(raw.kdfSalt),
    raw.kdfOps,
    raw.kdfMem,
  );
  const ad = utf8(`vault:v1:user:${userId}`);
  const plain = await aeadDecrypt(
    kek,
    await fromB64(raw.ciphertext),
    await fromB64(raw.nonce),
    ad,
  );
  const parsed = JSON.parse(fromUtf8(plain)) as VaultPlaintext;
  if (!parsed.sessions) parsed.sessions = {};
  cached = parsed;
  cachedUserId = userId;
  cachedKek = kek;
  return parsed;
};

export const persistVault = async (): Promise<void> => {
  if (!cached || cachedUserId === null || !cachedKek) {
    throw new Error('Vault not unlocked');
  }
  const database = await db();
  const raw = (await database.get(STORE, VAULT_KEY)) as StoredVault | undefined;
  if (!raw || raw.userId !== cachedUserId) throw new Error('Vault missing');
  const ad = utf8(`vault:v1:user:${cachedUserId}`);
  const { ciphertext, nonce } = await aeadEncrypt(
    cachedKek,
    utf8(JSON.stringify(cached)),
    ad,
  );
  const stored: StoredVault = {
    ...raw,
    ciphertext: await toB64(ciphertext),
    nonce: await toB64(nonce),
  };
  await database.put(STORE, stored, VAULT_KEY);
};

export const lockVault = (): void => {
  cached = null;
  cachedUserId = null;
  cachedKek = null;
};

export const getCachedVault = (): VaultPlaintext | null => cached;

export const getIdentityFingerprint = async (
  vault: VaultPlaintext,
): Promise<string> => {
  const s = await getSodium();
  const pub = await fromB64(vault.identity.publicKey);
  const hash = s.crypto_generichash(16, pub);
  const hex = Array.from(hash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.match(/.{4}/g)?.join(' ') ?? hex;
};

export const consumeOneTimePrivate = async (
  keyId: number,
): Promise<KeyPair | null> => {
  if (!cached) return null;
  const idx = cached.oneTimePreKeys.findIndex((k) => k.keyId === keyId);
  if (idx < 0) return null;
  const [removed] = cached.oneTimePreKeys.splice(idx, 1);
  return {
    publicKey: await fromB64(removed.publicKey),
    privateKey: await fromB64(removed.privateKey),
  };
};

export const replenishOneTimePreKeys = async (
  count = 50,
): Promise<Array<{ keyId: number; publicKey: string }>> => {
  if (!cached) throw new Error('Vault not unlocked');
  const s = await getSodium();
  const existingMaxId = cached.oneTimePreKeys.reduce(
    (m, k) => Math.max(m, k.keyId),
    0,
  );
  const out: Array<{ keyId: number; publicKey: string }> = [];
  for (let i = 0; i < count; i++) {
    const kp = s.crypto_box_keypair();
    const keyId = existingMaxId + i + 1;
    cached.oneTimePreKeys.push({
      keyId,
      publicKey: await toB64(kp.publicKey),
      privateKey: await toB64(kp.privateKey),
    });
    out.push({ keyId, publicKey: await toB64(kp.publicKey) });
  }
  return out;
};

export const destroyVault = async (): Promise<void> => {
  cached = null;
  cachedUserId = null;
  const database = await db();
  await database.delete(STORE, VAULT_KEY);
};

export { concat };

export const requireVault = (): VaultPlaintext => {
  if (!cached) throw new Error('Vault is locked');
  return cached;
};

export const getIdentityKeyPair = async (): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> => {
  const v = requireVault();
  return {
    publicKey: await fromB64(v.identity.publicKey),
    privateKey: await fromB64(v.identity.privateKey),
  };
};

export const getRegistrationId = (): number => requireVault().registrationId;

export const getSignedPreKeyPrivateById = async (
  keyId: number,
): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
} | null> => {
  const v = requireVault();
  if (v.signedPreKey.keyId !== keyId) return null;
  return {
    publicKey: await fromB64(v.signedPreKey.publicKey),
    privateKey: await fromB64(v.signedPreKey.privateKey),
  };
};

export const loadSession = (peerUserId: number): SessionJson | null => {
  const v = requireVault();
  return v.sessions[String(peerUserId)] ?? null;
};

export const saveSession = (peerUserId: number, session: SessionJson): void => {
  const v = requireVault();
  v.sessions[String(peerUserId)] = session;
};

export const deleteSession = (peerUserId: number): void => {
  const v = requireVault();
  delete v.sessions[String(peerUserId)];
};

const peerSenderKey = (groupId: number, senderUserId: number) =>
  `${groupId}:${senderUserId}`;

export const loadMySenderKey = (groupId: number): MySenderKeyJson | null => {
  const v = requireVault();
  return v.mySenderKeys?.[String(groupId)] ?? null;
};

export const saveMySenderKey = (key: MySenderKeyJson): void => {
  const v = requireVault();
  v.mySenderKeys ??= {};
  v.mySenderKeys[String(key.groupId)] = key;
};

export const deleteMySenderKey = (groupId: number): void => {
  const v = requireVault();
  if (v.mySenderKeys) delete v.mySenderKeys[String(groupId)];
};

export const loadPeerSenderKey = (
  groupId: number,
  senderUserId: number,
): PeerSenderKeyJson | null => {
  const v = requireVault();
  return v.peerSenderKeys?.[peerSenderKey(groupId, senderUserId)] ?? null;
};

export const savePeerSenderKey = (key: PeerSenderKeyJson): void => {
  const v = requireVault();
  v.peerSenderKeys ??= {};
  v.peerSenderKeys[peerSenderKey(key.groupId, key.senderUserId)] = key;
};

export const deletePeerSenderKeysForGroup = (groupId: number): void => {
  const v = requireVault();
  if (!v.peerSenderKeys) return;
  const prefix = `${groupId}:`;
  for (const k of Object.keys(v.peerSenderKeys)) {
    if (k.startsWith(prefix)) delete v.peerSenderKeys[k];
  }
};
