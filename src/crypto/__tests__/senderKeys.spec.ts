import { describe, it, expect } from 'vitest';
import {
  generateMySenderKey,
  toDistributionPayload,
  fromDistributionPayload,
  encryptWithSenderKey,
  decryptWithSenderKey,
} from '../senderKeys';

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

describe('Sender Keys (group encryption)', () => {
  it('encrypt → decrypt round-trip with a freshly distributed sender key', async () => {
    const my = await generateMySenderKey(/*groupId*/ 1, /*chainId*/ 1);
    const peer = fromDistributionPayload(
      toDistributionPayload(my),
      /*senderUserId*/ 42,
    );

    const out = await encryptWithSenderKey(my, 42, enc('hello group'));
    const result = await decryptWithSenderKey(
      peer,
      out.header,
      out.ciphertext,
      out.nonce,
    );
    expect(dec(result.plaintext)).toBe('hello group');
  });

  it('peer can catch up with multiple skipped iterations via skipped cache', async () => {
    let my = await generateMySenderKey(2, 1);
    let peer = fromDistributionPayload(toDistributionPayload(my), 7);

    // Sender produces 5 messages
    const outs = [];
    for (let i = 0; i < 5; i++) {
      const o = await encryptWithSenderKey(my, 7, enc(`m${i}`));
      outs.push(o);
      my = o.updatedKey;
    }

    // Peer receives them out of order: 4, then 0, then 2, then 1, then 3
    const order = [4, 0, 2, 1, 3];
    for (const idx of order) {
      const o = outs[idx];
      const { plaintext, updatedKey } = await decryptWithSenderKey(
        peer,
        o.header,
        o.ciphertext,
        o.nonce,
      );
      expect(dec(plaintext)).toBe(`m${idx}`);
      peer = updatedKey;
    }
  });

  it('rejects forged group message (Ed25519 signature verification fails)', async () => {
    const my = await generateMySenderKey(3, 1);
    const peer = fromDistributionPayload(toDistributionPayload(my), 9);

    const o = await encryptWithSenderKey(my, 9, enc('legit'));
    // Tamper with ciphertext: signature is over (nonce || ciphertext)
    const broken = new Uint8Array(o.ciphertext);
    broken[0] ^= 0x01;
    await expect(
      decryptWithSenderKey(peer, o.header, broken, o.nonce),
    ).rejects.toThrow(/signature is invalid/i);
  });

  it('rejects message from a different chainId (signals need for re-distribution)', async () => {
    const my = await generateMySenderKey(4, 1);
    const peer = fromDistributionPayload(toDistributionPayload(my), 11);

    const o = await encryptWithSenderKey(my, 11, enc('x'));
    const wrongChain = { ...o.header, chainId: 999 };
    await expect(
      decryptWithSenderKey(peer, wrongChain, o.ciphertext, o.nonce),
    ).rejects.toThrow(/chain mismatch/i);
  });
});
