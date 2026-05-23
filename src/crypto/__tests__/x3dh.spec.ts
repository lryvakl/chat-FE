import { describe, it, expect } from 'vitest';
import { runX3dhInitiator, runX3dhResponder } from '../x3dh';
import { getSodium } from '../sodium';
import { toB64 } from '../encoding';

describe('X3DH', () => {
  it('initiator and responder derive the same shared secret with OTP', async () => {
    const s = await getSodium();

    const aliceIdent = s.crypto_sign_keypair();
    const bobIdent = s.crypto_sign_keypair();
    const bobSpk = s.crypto_box_keypair();
    const bobSpkSig = s.crypto_sign_detached(bobSpk.publicKey, bobIdent.privateKey);
    const bobOpk = s.crypto_box_keypair();

    const init = await runX3dhInitiator({
      myRegistrationId: 100,
      myIdentityEdPublic: aliceIdent.publicKey,
      myIdentityEdPrivate: aliceIdent.privateKey,
      peer: {
        registrationId: 200,
        identityEdPublic: bobIdent.publicKey,
        signedPreKey: {
          keyId: 1,
          publicKey: bobSpk.publicKey,
          signature: bobSpkSig,
        },
        oneTimePreKey: { keyId: 1, publicKey: bobOpk.publicKey },
      },
    });

    const resp = await runX3dhResponder({
      myIdentityEdPrivate: bobIdent.privateKey,
      mySignedPreKeyPrivate: bobSpk.privateKey,
      myOneTimePreKeyPrivate: bobOpk.privateKey,
      envelope: init.envelope,
    });

    expect(await toB64(init.sharedSecret)).toBe(await toB64(resp.sharedSecret));
  });

  it('initiator and responder agree even without one-time prekey', async () => {
    const s = await getSodium();

    const aliceIdent = s.crypto_sign_keypair();
    const bobIdent = s.crypto_sign_keypair();
    const bobSpk = s.crypto_box_keypair();
    const bobSpkSig = s.crypto_sign_detached(bobSpk.publicKey, bobIdent.privateKey);

    const init = await runX3dhInitiator({
      myRegistrationId: 100,
      myIdentityEdPublic: aliceIdent.publicKey,
      myIdentityEdPrivate: aliceIdent.privateKey,
      peer: {
        registrationId: 200,
        identityEdPublic: bobIdent.publicKey,
        signedPreKey: {
          keyId: 1,
          publicKey: bobSpk.publicKey,
          signature: bobSpkSig,
        },
        oneTimePreKey: null,
      },
    });

    const resp = await runX3dhResponder({
      myIdentityEdPrivate: bobIdent.privateKey,
      mySignedPreKeyPrivate: bobSpk.privateKey,
      myOneTimePreKeyPrivate: null,
      envelope: init.envelope,
    });

    expect(await toB64(init.sharedSecret)).toBe(await toB64(resp.sharedSecret));
  });

  it('refuses to run initiator when the signed-prekey signature is invalid (MITM defence)', async () => {
    const s = await getSodium();
    const aliceIdent = s.crypto_sign_keypair();
    const bobIdent = s.crypto_sign_keypair();
    const evilIdent = s.crypto_sign_keypair();
    const bobSpk = s.crypto_box_keypair();
    // Signature made by the WRONG identity:
    const forgedSig = s.crypto_sign_detached(bobSpk.publicKey, evilIdent.privateKey);

    await expect(
      runX3dhInitiator({
        myRegistrationId: 100,
        myIdentityEdPublic: aliceIdent.publicKey,
        myIdentityEdPrivate: aliceIdent.privateKey,
        peer: {
          registrationId: 200,
          identityEdPublic: bobIdent.publicKey,
          signedPreKey: {
            keyId: 1,
            publicKey: bobSpk.publicKey,
            signature: forgedSig,
          },
          oneTimePreKey: null,
        },
      }),
    ).rejects.toThrow(/signature is invalid/i);
  });
});
