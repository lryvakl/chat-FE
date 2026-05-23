import { describe, it, expect } from 'vitest';
import {
  aeadEncrypt,
  aeadDecrypt,
  kdfChain,
  kdfRoot,
  newDhKeyPair,
  x25519Dh,
  edPubToX25519,
  edPrivToX25519,
  verifyEd25519,
  deriveX3dhSecret,
} from '../primitives';
import { getSodium } from '../sodium';

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

describe('AEAD (XChaCha20-Poly1305)', () => {
  it('round-trips a plaintext under the same key + ad', async () => {
    const s = await getSodium();
    const key = s.randombytes_buf(32);
    const ad = enc('header');
    const { ciphertext, nonce } = await aeadEncrypt(key, enc('secret message'), ad);
    const back = await aeadDecrypt(key, ciphertext, nonce, ad);
    expect(dec(back)).toBe('secret message');
  });

  it('rejects ciphertext under a different key', async () => {
    const s = await getSodium();
    const k1 = s.randombytes_buf(32);
    const k2 = s.randombytes_buf(32);
    const { ciphertext, nonce } = await aeadEncrypt(k1, enc('x'), enc('ad'));
    await expect(aeadDecrypt(k2, ciphertext, nonce, enc('ad'))).rejects.toBeDefined();
  });

  it('rejects ciphertext when AD is different (associated-data binding)', async () => {
    const s = await getSodium();
    const k = s.randombytes_buf(32);
    const { ciphertext, nonce } = await aeadEncrypt(k, enc('x'), enc('ad1'));
    await expect(aeadDecrypt(k, ciphertext, nonce, enc('ad2'))).rejects.toBeDefined();
  });

  it('produces a different nonce each call (randomised)', async () => {
    const s = await getSodium();
    const k = s.randombytes_buf(32);
    const a = await aeadEncrypt(k, enc('x'), enc('ad'));
    const b = await aeadEncrypt(k, enc('x'), enc('ad'));
    expect(Buffer.from(a.nonce).toString('hex')).not.toBe(
      Buffer.from(b.nonce).toString('hex'),
    );
  });
});

describe('KDF', () => {
  it('kdfChain is deterministic — same input gives same output', async () => {
    const s = await getSodium();
    const ck = s.randombytes_buf(32);
    const a = await kdfChain(ck);
    const b = await kdfChain(ck);
    expect(Buffer.from(a.chainKey).toString('hex')).toBe(
      Buffer.from(b.chainKey).toString('hex'),
    );
    expect(Buffer.from(a.messageKey).toString('hex')).toBe(
      Buffer.from(b.messageKey).toString('hex'),
    );
  });

  it('kdfChain produces distinct chainKey and messageKey from the same input', async () => {
    const s = await getSodium();
    const ck = s.randombytes_buf(32);
    const { chainKey, messageKey } = await kdfChain(ck);
    expect(Buffer.from(chainKey).toString('hex')).not.toBe(
      Buffer.from(messageKey).toString('hex'),
    );
  });

  it('kdfRoot produces split rootKey + chainKey of correct length', async () => {
    const s = await getSodium();
    const rk = s.randombytes_buf(32);
    const dh = s.randombytes_buf(32);
    const { rootKey, chainKey } = await kdfRoot(rk, dh);
    expect(rootKey.length).toBe(32);
    expect(chainKey.length).toBe(32);
  });
});

describe('X25519 DH and Ed→X conversion', () => {
  it('two parties derive the same shared secret', async () => {
    const a = await newDhKeyPair();
    const b = await newDhKeyPair();
    const ab = await x25519Dh(a.privateKey, b.publicKey);
    const ba = await x25519Dh(b.privateKey, a.publicKey);
    expect(Buffer.from(ab).toString('hex')).toBe(Buffer.from(ba).toString('hex'));
  });

  it('edPubToX25519 and edPrivToX25519 yield a usable X25519 key pair', async () => {
    const s = await getSodium();
    const ed = s.crypto_sign_keypair();
    const xPub = await edPubToX25519(ed.publicKey);
    const xPriv = await edPrivToX25519(ed.privateKey);
    expect(xPub.length).toBe(32);
    expect(xPriv.length).toBe(32);
  });
});

describe('Ed25519 signatures', () => {
  it('verifyEd25519 accepts a valid signature and rejects a tampered one', async () => {
    const s = await getSodium();
    const kp = s.crypto_sign_keypair();
    const msg = enc('hello');
    const sig = s.crypto_sign_detached(msg, kp.privateKey);
    expect(await verifyEd25519(msg, sig, kp.publicKey)).toBe(true);

    const broken = new Uint8Array(sig);
    broken[0] ^= 0x01;
    expect(await verifyEd25519(msg, broken, kp.publicKey)).toBe(false);
  });
});

describe('deriveX3dhSecret', () => {
  it('deterministic for the same DH parts', async () => {
    const s = await getSodium();
    const a = s.randombytes_buf(32);
    const b = s.randombytes_buf(32);
    const r1 = await deriveX3dhSecret([a, b]);
    const r2 = await deriveX3dhSecret([a, b]);
    expect(Buffer.from(r1).toString('hex')).toBe(Buffer.from(r2).toString('hex'));
  });

  it('different parts yield different secrets', async () => {
    const s = await getSodium();
    const r1 = await deriveX3dhSecret([s.randombytes_buf(32), s.randombytes_buf(32)]);
    const r2 = await deriveX3dhSecret([s.randombytes_buf(32), s.randombytes_buf(32)]);
    expect(Buffer.from(r1).toString('hex')).not.toBe(
      Buffer.from(r2).toString('hex'),
    );
  });
});
