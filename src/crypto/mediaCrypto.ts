import { fromB64, toB64 } from './encoding';
import { aeadDecrypt, aeadEncrypt } from './primitives';
import { getSodium } from './sodium';

const EMPTY_AD = new Uint8Array(0);

export interface EncryptedBlob {
  ciphertext: Uint8Array;
  keyB64: string;
  nonceB64: string;
}

export const encryptBlob = async (
  plaintext: Uint8Array,
): Promise<EncryptedBlob> => {
  const s = await getSodium();
  const key = s.randombytes_buf(32);
  const { ciphertext, nonce } = await aeadEncrypt(key, plaintext, EMPTY_AD);
  return {
    ciphertext,
    keyB64: await toB64(key),
    nonceB64: await toB64(nonce),
  };
};

export const decryptBlob = async (
  ciphertext: Uint8Array,
  keyB64: string,
  nonceB64: string,
): Promise<Uint8Array> => {
  const key = await fromB64(keyB64);
  const nonce = await fromB64(nonceB64);
  return aeadDecrypt(key, ciphertext, nonce, EMPTY_AD);
};
