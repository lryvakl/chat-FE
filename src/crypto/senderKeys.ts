import { concat, fromB64, toB64 } from './encoding';
import { aeadDecrypt, aeadEncrypt, kdfChain } from './primitives';
import { getSodium } from './sodium';

export interface MySenderKeyJson {
  groupId: number;
  chainId: number;
  signingPublic: string;
  signingPrivate: string;
  chainKey: string;
  iteration: number;
  distributedTo: number[];
}

export interface PeerSenderKeyJson {
  groupId: number;
  senderUserId: number;
  chainId: number;
  signingPublic: string;
  chainKey: string;
  iteration: number;
  skipped: Array<{ iteration: number; mk: string }>;
}

export interface GroupMessageHeader {
  v: 1;
  group: true;
  senderUserId: number;
  chainId: number;
  iteration: number;
  signature: string;
}

export interface SenderKeyDistributionPayload {
  groupId: number;
  chainId: number;
  signingPublic: string;
  chainKey: string;
  startIteration: number;
}

const MAX_GROUP_SKIPPED = 1000;

export const generateMySenderKey = async (
  groupId: number,
  chainId: number,
): Promise<MySenderKeyJson> => {
  const s = await getSodium();
  const signing = s.crypto_sign_keypair();
  const chainKey = s.randombytes_buf(32);
  return {
    groupId,
    chainId,
    signingPublic: await toB64(signing.publicKey),
    signingPrivate: await toB64(signing.privateKey),
    chainKey: await toB64(chainKey),
    iteration: 0,
    distributedTo: [],
  };
};

export const toDistributionPayload = (
  key: MySenderKeyJson,
): SenderKeyDistributionPayload => ({
  groupId: key.groupId,
  chainId: key.chainId,
  signingPublic: key.signingPublic,
  chainKey: key.chainKey,
  startIteration: key.iteration,
});

export const fromDistributionPayload = (
  payload: SenderKeyDistributionPayload,
  senderUserId: number,
): PeerSenderKeyJson => ({
  groupId: payload.groupId,
  senderUserId,
  chainId: payload.chainId,
  signingPublic: payload.signingPublic,
  chainKey: payload.chainKey,
  iteration: payload.startIteration,
  skipped: [],
});

export const encryptWithSenderKey = async (
  key: MySenderKeyJson,
  senderUserId: number,
  plaintext: Uint8Array,
): Promise<{
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  header: GroupMessageHeader;
  updatedKey: MySenderKeyJson;
}> => {
  const s = await getSodium();
  const ck = await fromB64(key.chainKey);
  const { chainKey: nextCk, messageKey } = await kdfChain(ck);

  const iteration = key.iteration;
  const headerBytes = new TextEncoder().encode(
    JSON.stringify({
      v: 1,
      group: true,
      senderUserId,
      chainId: key.chainId,
      iteration,
    }),
  );
  const ad = concat(headerBytes);
  const { ciphertext, nonce } = await aeadEncrypt(messageKey, plaintext, ad);

  const signingPriv = await fromB64(key.signingPrivate);
  const signature = s.crypto_sign_detached(
    concat(nonce, ciphertext),
    signingPriv,
  );

  const header: GroupMessageHeader = {
    v: 1,
    group: true,
    senderUserId,
    chainId: key.chainId,
    iteration,
    signature: await toB64(signature),
  };

  const updatedKey: MySenderKeyJson = {
    ...key,
    chainKey: await toB64(nextCk),
    iteration: iteration + 1,
  };
  return { ciphertext, nonce, header, updatedKey };
};

export const decryptWithSenderKey = async (
  peerKey: PeerSenderKeyJson,
  header: GroupMessageHeader,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Promise<{ plaintext: Uint8Array; updatedKey: PeerSenderKeyJson }> => {
  const s = await getSodium();
  if (header.chainId !== peerKey.chainId) {
    throw new Error(
      `Sender key chain mismatch (expected ${peerKey.chainId}, got ${header.chainId}). Awaiting fresh distribution.`,
    );
  }

  const signingPub = await fromB64(peerKey.signingPublic);
  const signatureBytes = await fromB64(header.signature);
  const sigOk = s.crypto_sign_verify_detached(
    signatureBytes,
    concat(nonce, ciphertext),
    signingPub,
  );
  if (!sigOk) {
    throw new Error('Group message signature is invalid');
  }

  const headerBytes = new TextEncoder().encode(
    JSON.stringify({
      v: 1,
      group: true,
      senderUserId: header.senderUserId,
      chainId: header.chainId,
      iteration: header.iteration,
    }),
  );
  const ad = concat(headerBytes);

  const stashIdx = peerKey.skipped.findIndex(
    (e) => e.iteration === header.iteration,
  );
  if (stashIdx >= 0) {
    const mk = await fromB64(peerKey.skipped[stashIdx].mk);
    const plaintext = await aeadDecrypt(mk, ciphertext, nonce, ad);
    const updated: PeerSenderKeyJson = {
      ...peerKey,
      skipped: peerKey.skipped.filter((_, i) => i !== stashIdx),
    };
    return { plaintext, updatedKey: updated };
  }

  if (header.iteration < peerKey.iteration) {
    throw new Error(
      `Replay or unknown old iteration (have ${peerKey.iteration}, got ${header.iteration})`,
    );
  }

  let chainKey = await fromB64(peerKey.chainKey);
  let iter = peerKey.iteration;
  const newSkipped: Array<{ iteration: number; mk: string }> = [
    ...peerKey.skipped,
  ];

  while (iter < header.iteration) {
    if (newSkipped.length >= MAX_GROUP_SKIPPED) {
      throw new Error('Too many skipped group keys');
    }
    const { chainKey: next, messageKey } = await kdfChain(chainKey);
    newSkipped.push({ iteration: iter, mk: await toB64(messageKey) });
    chainKey = next;
    iter += 1;
  }

  const { chainKey: nextCk, messageKey } = await kdfChain(chainKey);
  const plaintext = await aeadDecrypt(messageKey, ciphertext, nonce, ad);

  const updated: PeerSenderKeyJson = {
    ...peerKey,
    chainKey: await toB64(nextCk),
    iteration: iter + 1,
    skipped: newSkipped,
  };
  return { plaintext, updatedKey: updated };
};
