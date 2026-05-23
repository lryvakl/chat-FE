import { describe, it, expect } from 'vitest';
import {
  initInitiatorState,
  initResponderState,
  ratchetEncrypt,
  ratchetDecrypt,
  serializeSession,
  deserializeSession,
  type RatchetState,
} from '../ratchet';
import { newDhKeyPair, deriveX3dhSecret } from '../primitives';
import { getSodium } from '../sodium';

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

interface Pair {
  alice: RatchetState;
  bob: RatchetState;
}

async function makeAliceBobSessions(): Promise<Pair> {
  const s = await getSodium();
  // Identity X25519 pairs (shortcut — same role as identity for this test)
  const aliceIdent = s.crypto_box_keypair();
  const bobIdent = s.crypto_box_keypair();

  // Bob has a signed pre-key (used by Alice for first DH and by Bob to start sending chain)
  const bobSpk = await newDhKeyPair();

  // Toy shared secret — in real flow this comes from X3DH; we only need ratchet symmetry here
  const sharedSecret = await deriveX3dhSecret([
    s.crypto_scalarmult(aliceIdent.privateKey, bobSpk.publicKey),
    s.crypto_scalarmult(aliceIdent.privateKey, bobIdent.publicKey),
    s.crypto_scalarmult(bobSpk.privateKey, bobIdent.publicKey),
  ]);

  const alice = await initInitiatorState(
    sharedSecret,
    bobSpk.publicKey,
    aliceIdent.publicKey, // using identity public as "myIdentityX" surrogate
    bobIdent.publicKey,
  );
  const bob = initResponderState(
    sharedSecret,
    bobSpk,
    bobIdent.publicKey,
    aliceIdent.publicKey,
  );
  return { alice, bob };
}

describe('Double Ratchet', () => {
  it('Alice → Bob: first message decrypts back to the original plaintext', async () => {
    const { alice, bob } = await makeAliceBobSessions();
    const { ciphertext, nonce, header } = await ratchetEncrypt(alice, enc('hi bob'));
    const out = await ratchetDecrypt(bob, header, ciphertext, nonce);
    expect(dec(out)).toBe('hi bob');
  });

  it('handles 100 messages in alternating directions without drift', async () => {
    const { alice, bob } = await makeAliceBobSessions();
    for (let i = 0; i < 50; i++) {
      const aMsg = `A->${i}`;
      const aOut = await ratchetEncrypt(alice, enc(aMsg));
      expect(dec(await ratchetDecrypt(bob, aOut.header, aOut.ciphertext, aOut.nonce))).toBe(
        aMsg,
      );
      const bMsg = `B->${i}`;
      const bOut = await ratchetEncrypt(bob, enc(bMsg));
      expect(dec(await ratchetDecrypt(alice, bOut.header, bOut.ciphertext, bOut.nonce))).toBe(
        bMsg,
      );
    }
  });

  it('tolerates out-of-order delivery (n=2 arrives before n=0, n=1)', async () => {
    const { alice, bob } = await makeAliceBobSessions();
    const m0 = await ratchetEncrypt(alice, enc('m0'));
    const m1 = await ratchetEncrypt(alice, enc('m1'));
    const m2 = await ratchetEncrypt(alice, enc('m2'));

    // Bob receives in order 2,0,1
    expect(dec(await ratchetDecrypt(bob, m2.header, m2.ciphertext, m2.nonce))).toBe('m2');
    expect(dec(await ratchetDecrypt(bob, m0.header, m0.ciphertext, m0.nonce))).toBe('m0');
    expect(dec(await ratchetDecrypt(bob, m1.header, m1.ciphertext, m1.nonce))).toBe('m1');
  });

  it('performs a DH-ratchet when peer sends with a new dhPub', async () => {
    const { alice, bob } = await makeAliceBobSessions();

    // Alice → Bob (initialises Bob's receiving chain)
    const a1 = await ratchetEncrypt(alice, enc('first'));
    await ratchetDecrypt(bob, a1.header, a1.ciphertext, a1.nonce);
    const bobDhBefore = bob.dhSendingPublic;

    // Bob → Alice: this triggers Bob's first send chain via DH-ratchet
    const b1 = await ratchetEncrypt(bob, enc('reply'));
    const decoded = await ratchetDecrypt(alice, b1.header, b1.ciphertext, b1.nonce);
    expect(dec(decoded)).toBe('reply');

    // Alice → Bob again: she now uses fresh dhSending after seeing Bob's new dhPub
    const a2 = await ratchetEncrypt(alice, enc('second'));
    await ratchetDecrypt(bob, a2.header, a2.ciphertext, a2.nonce);
    expect(bob.dhSendingPublic).not.toEqual(bobDhBefore);
  });

  it('rejects tampered ciphertext (AEAD authentication catches forgery)', async () => {
    const { alice, bob } = await makeAliceBobSessions();
    const m = await ratchetEncrypt(alice, enc('legit'));
    const tampered = new Uint8Array(m.ciphertext);
    tampered[0] ^= 0xff;
    await expect(
      ratchetDecrypt(bob, m.header, tampered, m.nonce),
    ).rejects.toBeDefined();
  });

  it('rejects header forgery (changing n breaks AEAD additional-data binding)', async () => {
    const { alice, bob } = await makeAliceBobSessions();
    const m = await ratchetEncrypt(alice, enc('legit'));
    const forged = { ...m.header, n: m.header.n + 1 };
    await expect(
      ratchetDecrypt(bob, forged, m.ciphertext, m.nonce),
    ).rejects.toBeDefined();
  });

  it('serializes and deserializes a session preserving subsequent decrypt ability', async () => {
    const { alice, bob } = await makeAliceBobSessions();

    // Warm sessions up
    const a1 = await ratchetEncrypt(alice, enc('one'));
    await ratchetDecrypt(bob, a1.header, a1.ciphertext, a1.nonce);

    const snapshot = await serializeSession(bob);
    const bobReloaded = await deserializeSession(snapshot);

    const a2 = await ratchetEncrypt(alice, enc('two'));
    const out = await ratchetDecrypt(
      bobReloaded,
      a2.header,
      a2.ciphertext,
      a2.nonce,
    );
    expect(dec(out)).toBe('two');
  });

  it('caps skipped message keys to prevent DoS via huge n', async () => {
    const { alice, bob } = await makeAliceBobSessions();

    // Encrypt one normal message to initialise Bob's receiving chain
    const m0 = await ratchetEncrypt(alice, enc('warmup'));
    await ratchetDecrypt(bob, m0.header, m0.ciphertext, m0.nonce);

    // Encrypt many messages but only forward one with huge n
    for (let i = 0; i < 5; i++) await ratchetEncrypt(alice, enc('skip'));
    const big = await ratchetEncrypt(alice, enc('skipped'));
    const forged = { ...big.header, n: big.header.n + 5000 };

    await expect(
      ratchetDecrypt(bob, forged, big.ciphertext, big.nonce),
    ).rejects.toBeDefined();
  });
});
