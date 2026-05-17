import { concat } from './encoding';
import { getSodium } from './sodium';

const DS_X3DH_SECRET = new Uint8Array(
  new TextEncoder().encode('e2ee:v1:x3dh:secret'),
);
const DS_ROOT_KDF = new Uint8Array(new TextEncoder().encode('e2ee:v1:dr:root'));
const DS_CHAIN_KDF_MK = new Uint8Array(
  new TextEncoder().encode('e2ee:v1:dr:chain:mk'),
);
const DS_CHAIN_KDF_CK = new Uint8Array(
  new TextEncoder().encode('e2ee:v1:dr:chain:ck'),
);

export const x25519Dh = async (
  privateKey: Uint8Array,
  peerPublic: Uint8Array,
): Promise<Uint8Array> => {
  const s = await getSodium();
  return s.crypto_scalarmult(privateKey, peerPublic);
};

export const edPubToX25519 = async (
  edPublic: Uint8Array,
): Promise<Uint8Array> => {
  const s = await getSodium();
  return s.crypto_sign_ed25519_pk_to_curve25519(edPublic);
};

export const edPrivToX25519 = async (
  edPrivate: Uint8Array,
): Promise<Uint8Array> => {
  const s = await getSodium();
  return s.crypto_sign_ed25519_sk_to_curve25519(edPrivate);
};

export const verifyEd25519 = async (
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> => {
  const s = await getSodium();
  try {
    return s.crypto_sign_verify_detached(signature, message, publicKey);
  } catch {
    return false;
  }
};

const keyedHash = async (
  key: Uint8Array,
  data: Uint8Array,
  outLen = 32,
): Promise<Uint8Array> => {
  const s = await getSodium();
  return s.crypto_generichash(outLen, data, key);
};

export const deriveX3dhSecret = async (
  parts: Uint8Array[],
): Promise<Uint8Array> => keyedHash(DS_X3DH_SECRET, concat(...parts), 32);

export const kdfRoot = async (
  rootKey: Uint8Array,
  dhOutput: Uint8Array,
): Promise<{ rootKey: Uint8Array; chainKey: Uint8Array }> => {
  const out = await keyedHash(rootKey, concat(DS_ROOT_KDF, dhOutput), 64);
  return { rootKey: out.slice(0, 32), chainKey: out.slice(32, 64) };
};

export const kdfChain = async (
  chainKey: Uint8Array,
): Promise<{ chainKey: Uint8Array; messageKey: Uint8Array }> => {
  const next = await keyedHash(chainKey, DS_CHAIN_KDF_CK, 32);
  const mk = await keyedHash(chainKey, DS_CHAIN_KDF_MK, 32);
  return { chainKey: next, messageKey: mk };
};

export const aeadEncrypt = async (
  key: Uint8Array,
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
    key,
  );
  return { ciphertext, nonce };
};

export const aeadDecrypt = async (
  key: Uint8Array,
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
    key,
  );
};

export const newDhKeyPair = async (): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> => {
  const s = await getSodium();
  const kp = s.crypto_box_keypair();
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
};
