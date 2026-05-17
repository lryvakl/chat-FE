import { fromB64, toB64, utf8, fromUtf8 } from './encoding';
import {
  getIdentityKeyPair,
  getRegistrationId,
  getSignedPreKeyPrivateById,
  loadSession,
  persistVault,
  saveSession,
} from './keyStore';
import { consumeOneTimePrivate } from './keyStore';
import { peerKey, withLock } from './peerLock';
import { edPubToX25519 } from './primitives';
import {
  deserializeSession,
  initInitiatorState,
  initResponderState,
  ratchetDecrypt,
  ratchetEncrypt,
  serializeSession,
  type MessageHeader,
  type RatchetState,
} from './ratchet';
import {
  runX3dhInitiator,
  runX3dhResponder,
  type PrekeyEnvelope,
} from './x3dh';
import { keysApi } from '../api/keysApi';

export interface OutgoingCiphertext {
  ciphertext: string;
  header: string;
  isEncrypted: true;
}

const packCiphertext = async (
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Promise<string> => {
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, nonce.length);
  return toB64(combined);
};

const unpackCiphertext = async (
  b64: string,
): Promise<{ nonce: Uint8Array; ciphertext: Uint8Array }> => {
  const bytes = await fromB64(b64);
  const nonce = bytes.slice(0, 24);
  const ciphertext = bytes.slice(24);
  return { nonce, ciphertext };
};

const loadState = async (peerUserId: number): Promise<RatchetState | null> => {
  const json = loadSession(peerUserId);
  return json ? deserializeSession(json) : null;
};

const saveState = async (
  peerUserId: number,
  state: RatchetState,
): Promise<void> => {
  saveSession(peerUserId, await serializeSession(state));
  await persistVault();
};

export const encryptForPeer = (
  peerUserId: number,
  plaintext: string,
): Promise<OutgoingCiphertext> =>
  withLock(peerKey(peerUserId), () =>
    encryptForPeerLocked(peerUserId, plaintext),
  );

const encryptForPeerLocked = async (
  peerUserId: number,
  plaintext: string,
): Promise<OutgoingCiphertext> => {
  let state = await loadState(peerUserId);
  let prekeyEnvelope: PrekeyEnvelope | undefined;

  if (!state) {
    const peer = await keysApi.peer(peerUserId);
    const myIdentity = await getIdentityKeyPair();
    const myIdentityX = await edPubToX25519(myIdentity.publicKey);
    const peer_signedPreKeyPub = await fromB64(peer.signedPreKey.publicKey);
    const peer_signedPreKeySig = await fromB64(peer.signedPreKey.signature);
    const peer_identityEdPub = await fromB64(peer.identityPublicKey);
    const peer_otp = peer.oneTimePreKey
      ? {
          keyId: peer.oneTimePreKey.keyId,
          publicKey: await fromB64(peer.oneTimePreKey.publicKey),
        }
      : null;

    const x3dh = await runX3dhInitiator({
      myRegistrationId: getRegistrationId(),
      myIdentityEdPublic: myIdentity.publicKey,
      myIdentityEdPrivate: myIdentity.privateKey,
      peer: {
        registrationId: peer.registrationId,
        identityEdPublic: peer_identityEdPub,
        signedPreKey: {
          keyId: peer.signedPreKey.keyId,
          publicKey: peer_signedPreKeyPub,
          signature: peer_signedPreKeySig,
        },
        oneTimePreKey: peer_otp,
      },
    });

    state = await initInitiatorState(
      x3dh.sharedSecret,
      peer_signedPreKeyPub,
      myIdentityX,
      x3dh.peerIdentityX,
    );
    prekeyEnvelope = x3dh.envelope;
  }

  const out = await ratchetEncrypt(state, utf8(plaintext), prekeyEnvelope);
  await saveState(peerUserId, state);

  return {
    ciphertext: await packCiphertext(out.ciphertext, out.nonce),
    header: JSON.stringify(out.header),
    isEncrypted: true,
  };
};

export const decryptFromPeer = (
  peerUserId: number,
  headerJson: string,
  ciphertextB64: string,
): Promise<string> =>
  withLock(peerKey(peerUserId), () =>
    decryptFromPeerLocked(peerUserId, headerJson, ciphertextB64),
  );

const decryptFromPeerLocked = async (
  peerUserId: number,
  headerJson: string,
  ciphertextB64: string,
): Promise<string> => {
  const header = JSON.parse(headerJson) as MessageHeader;
  const { nonce, ciphertext } = await unpackCiphertext(ciphertextB64);

  let state = await loadState(peerUserId);

  if (header.prekey && state) {
    state = null;
  }

  if (!state) {
    if (!header.prekey) {
      throw new Error(
        'No local session and the message does not include a prekey envelope; cannot decrypt',
      );
    }
    const myIdentity = await getIdentityKeyPair();
    const myIdentityX = await edPubToX25519(myIdentity.publicKey);

    const signed = await getSignedPreKeyPrivateById(
      header.prekey.signedPreKeyId,
    );
    if (!signed) {
      throw new Error(
        `Signed prekey ${header.prekey.signedPreKeyId} is not available locally`,
      );
    }
    const otp =
      header.prekey.oneTimePreKeyId !== null
        ? await consumeOneTimePrivate(header.prekey.oneTimePreKeyId)
        : null;

    const x3dh = await runX3dhResponder({
      myIdentityEdPrivate: myIdentity.privateKey,
      mySignedPreKeyPrivate: signed.privateKey,
      myOneTimePreKeyPrivate: otp ? otp.privateKey : null,
      envelope: header.prekey,
    });

    state = initResponderState(
      x3dh.sharedSecret,
      signed,
      myIdentityX,
      x3dh.peerIdentityX,
    );
  }

  const plaintext = await ratchetDecrypt(state, header, ciphertext, nonce);
  await saveState(peerUserId, state);
  return fromUtf8(plaintext);
};
