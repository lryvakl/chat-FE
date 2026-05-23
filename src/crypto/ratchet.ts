import { concat, fromB64, toB64 } from './encoding';
import {
  aeadDecrypt,
  aeadEncrypt,
  kdfChain,
  kdfRoot,
  newDhKeyPair,
  x25519Dh,
} from './primitives';
import type { PrekeyEnvelope } from './x3dh';

export interface RatchetState {
  rootKey: Uint8Array;
  dhSendingPublic: Uint8Array;
  dhSendingPrivate: Uint8Array;
  dhReceivingPublic: Uint8Array | null;
  sendingChainKey: Uint8Array | null;
  receivingChainKey: Uint8Array | null;
  Ns: number;
  Nr: number;
  PN: number;
  skipped: Map<string, Uint8Array>;
  myIdentityX: Uint8Array;
  peerIdentityX: Uint8Array;
}

export interface MessageHeader {
  v: 1;
  dhPub: string;
  n: number;
  pn: number;
  prekey?: PrekeyEnvelope;
}

const MAX_SKIPPED = 1000;

const skippedKey = (_dhPub: Uint8Array, n: number, b64: string): string =>
  `${b64}:${n}`;

const additionalData = (
  header: MessageHeader,
  myIdX: Uint8Array,
  peerIdX: Uint8Array,
): Uint8Array => {
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  return concat(myIdX, peerIdX, headerBytes);
};

export const initInitiatorState = async (
  sharedSecret: Uint8Array,
  peerSignedPreKeyPub: Uint8Array,
  myIdentityX: Uint8Array,
  peerIdentityX: Uint8Array,
): Promise<RatchetState> => {
  const ratchet = await newDhKeyPair();
  const dh = await x25519Dh(ratchet.privateKey, peerSignedPreKeyPub);
  const { rootKey, chainKey } = await kdfRoot(sharedSecret, dh);
  return {
    rootKey,
    dhSendingPublic: ratchet.publicKey,
    dhSendingPrivate: ratchet.privateKey,
    dhReceivingPublic: peerSignedPreKeyPub,
    sendingChainKey: chainKey,
    receivingChainKey: null,
    Ns: 0,
    Nr: 0,
    PN: 0,
    skipped: new Map(),
    myIdentityX,
    peerIdentityX,
  };
};

export const initResponderState = (
  sharedSecret: Uint8Array,
  mySignedPreKeyPair: { publicKey: Uint8Array; privateKey: Uint8Array },
  myIdentityX: Uint8Array,
  peerIdentityX: Uint8Array,
): RatchetState => ({
  rootKey: sharedSecret,
  dhSendingPublic: mySignedPreKeyPair.publicKey,
  dhSendingPrivate: mySignedPreKeyPair.privateKey,
  dhReceivingPublic: null,
  sendingChainKey: null,
  receivingChainKey: null,
  Ns: 0,
  Nr: 0,
  PN: 0,
  skipped: new Map(),
  myIdentityX,
  peerIdentityX,
});

const dhRatchet = async (
  state: RatchetState,
  newPeerDhPub: Uint8Array,
): Promise<void> => {
  state.PN = state.Ns;
  state.Ns = 0;
  state.Nr = 0;
  state.dhReceivingPublic = newPeerDhPub;

  const dh1 = await x25519Dh(state.dhSendingPrivate, newPeerDhPub);
  const rec = await kdfRoot(state.rootKey, dh1);
  state.rootKey = rec.rootKey;
  state.receivingChainKey = rec.chainKey;

  const fresh = await newDhKeyPair();
  state.dhSendingPublic = fresh.publicKey;
  state.dhSendingPrivate = fresh.privateKey;

  const dh2 = await x25519Dh(state.dhSendingPrivate, newPeerDhPub);
  const snd = await kdfRoot(state.rootKey, dh2);
  state.rootKey = snd.rootKey;
  state.sendingChainKey = snd.chainKey;
};

const skipReceivingKeys = async (
  state: RatchetState,
  until: number,
): Promise<void> => {
  if (state.receivingChainKey === null || state.dhReceivingPublic === null) {
    return;
  }
  if (state.Nr + MAX_SKIPPED < until) {
    throw new Error('Too many skipped message keys; possible replay/flood');
  }
  const peerDhB64 = await toB64(state.dhReceivingPublic);
  while (state.Nr < until) {
    const { chainKey, messageKey } = await kdfChain(state.receivingChainKey);
    state.receivingChainKey = chainKey;
    state.skipped.set(
      skippedKey(state.dhReceivingPublic, state.Nr, peerDhB64),
      messageKey,
    );
    state.Nr += 1;
  }
};

export interface EncryptOut {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  header: MessageHeader;
}

export const ratchetEncrypt = async (
  state: RatchetState,
  plaintext: Uint8Array,
  prekey?: PrekeyEnvelope,
): Promise<EncryptOut> => {
  if (state.sendingChainKey === null) {
    throw new Error('Cannot encrypt — sending chain not initialised');
  }
  const { chainKey, messageKey } = await kdfChain(state.sendingChainKey);
  state.sendingChainKey = chainKey;

  const header: MessageHeader = {
    v: 1,
    dhPub: await toB64(state.dhSendingPublic),
    n: state.Ns,
    pn: state.PN,
  };
  if (prekey) header.prekey = prekey;
  state.Ns += 1;

  const ad = additionalData(header, state.myIdentityX, state.peerIdentityX);
  const { ciphertext, nonce } = await aeadEncrypt(messageKey, plaintext, ad);
  return { ciphertext, nonce, header };
};

const tryDecryptSkipped = async (
  state: RatchetState,
  header: MessageHeader,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Promise<Uint8Array | null> => {
  const dhPubBytes = await fromB64(header.dhPub);
  const lookup = skippedKey(dhPubBytes, header.n, header.dhPub);
  const mk = state.skipped.get(lookup);
  if (!mk) return null;
  state.skipped.delete(lookup);
  const ad = additionalData(header, state.peerIdentityX, state.myIdentityX);
  return aeadDecrypt(mk, ciphertext, nonce, ad);
};

export const ratchetDecrypt = async (
  state: RatchetState,
  header: MessageHeader,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Promise<Uint8Array> => {
  const skipped = await tryDecryptSkipped(state, header, ciphertext, nonce);
  if (skipped) return skipped;

  const incomingDhPub = await fromB64(header.dhPub);
  const isNewRatchet =
    state.dhReceivingPublic === null ||
    !equalBytes(state.dhReceivingPublic, incomingDhPub);

  if (isNewRatchet) {
    if (state.dhReceivingPublic !== null) {
      await skipReceivingKeys(state, header.pn);
    }
    await dhRatchet(state, incomingDhPub);
  }

  await skipReceivingKeys(state, header.n);

  if (state.receivingChainKey === null) {
    throw new Error('Receiving chain not initialised');
  }
  const { chainKey, messageKey } = await kdfChain(state.receivingChainKey);
  state.receivingChainKey = chainKey;
  state.Nr += 1;

  const ad = additionalData(header, state.peerIdentityX, state.myIdentityX);
  return aeadDecrypt(messageKey, ciphertext, nonce, ad);
};

const equalBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

export interface SessionJson {
  rootKey: string;
  dhSendingPublic: string;
  dhSendingPrivate: string;
  dhReceivingPublic: string | null;
  sendingChainKey: string | null;
  receivingChainKey: string | null;
  Ns: number;
  Nr: number;
  PN: number;
  skipped: Array<{ key: string; mk: string }>;
  myIdentityX: string;
  peerIdentityX: string;
}

export const serializeSession = async (
  state: RatchetState,
): Promise<SessionJson> => ({
  rootKey: await toB64(state.rootKey),
  dhSendingPublic: await toB64(state.dhSendingPublic),
  dhSendingPrivate: await toB64(state.dhSendingPrivate),
  dhReceivingPublic: state.dhReceivingPublic
    ? await toB64(state.dhReceivingPublic)
    : null,
  sendingChainKey: state.sendingChainKey
    ? await toB64(state.sendingChainKey)
    : null,
  receivingChainKey: state.receivingChainKey
    ? await toB64(state.receivingChainKey)
    : null,
  Ns: state.Ns,
  Nr: state.Nr,
  PN: state.PN,
  skipped: await Promise.all(
    Array.from(state.skipped.entries()).map(async ([key, mk]) => ({
      key,
      mk: await toB64(mk),
    })),
  ),
  myIdentityX: await toB64(state.myIdentityX),
  peerIdentityX: await toB64(state.peerIdentityX),
});

export const deserializeSession = async (
  json: SessionJson,
): Promise<RatchetState> => {
  const skipped = new Map<string, Uint8Array>();
  for (const { key, mk } of json.skipped) {
    skipped.set(key, await fromB64(mk));
  }
  return {
    rootKey: await fromB64(json.rootKey),
    dhSendingPublic: await fromB64(json.dhSendingPublic),
    dhSendingPrivate: await fromB64(json.dhSendingPrivate),
    dhReceivingPublic: json.dhReceivingPublic
      ? await fromB64(json.dhReceivingPublic)
      : null,
    sendingChainKey: json.sendingChainKey
      ? await fromB64(json.sendingChainKey)
      : null,
    receivingChainKey: json.receivingChainKey
      ? await fromB64(json.receivingChainKey)
      : null,
    Ns: json.Ns,
    Nr: json.Nr,
    PN: json.PN,
    skipped,
    myIdentityX: await fromB64(json.myIdentityX),
    peerIdentityX: await fromB64(json.peerIdentityX),
  };
};
