import { toB64 } from './encoding';
import { getSodium } from './sodium';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface IdentityBundle {
  registrationId: number;
  identity: KeyPair;
  signedPreKey: {
    keyId: number;
    keyPair: KeyPair;
    signature: Uint8Array;
  };
  oneTimePreKeys: Array<{
    keyId: number;
    keyPair: KeyPair;
  }>;
}

export interface UploadableBundle {
  registrationId: number;
  identityPublicKey: string;
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
}

const DEFAULT_ONE_TIME_COUNT = 100;

export const generateIdentityBundle = async (
  oneTimeCount = DEFAULT_ONE_TIME_COUNT,
): Promise<IdentityBundle> => {
  const s = await getSodium();

  const identityRaw = s.crypto_sign_keypair();
  const identity: KeyPair = {
    publicKey: identityRaw.publicKey,
    privateKey: identityRaw.privateKey,
  };

  const registrationId = s.randombytes_uniform(16384) + 1;

  const signedKeyId = 1;
  const signedX25519 = s.crypto_box_keypair();
  const signedPair: KeyPair = {
    publicKey: signedX25519.publicKey,
    privateKey: signedX25519.privateKey,
  };
  const signature = s.crypto_sign_detached(
    signedPair.publicKey,
    identity.privateKey,
  );

  const oneTimePreKeys: IdentityBundle['oneTimePreKeys'] = [];
  for (let i = 0; i < oneTimeCount; i++) {
    const kp = s.crypto_box_keypair();
    oneTimePreKeys.push({
      keyId: i + 1,
      keyPair: { publicKey: kp.publicKey, privateKey: kp.privateKey },
    });
  }

  return {
    registrationId,
    identity,
    signedPreKey: { keyId: signedKeyId, keyPair: signedPair, signature },
    oneTimePreKeys,
  };
};

export const toUploadableBundle = async (
  bundle: IdentityBundle,
): Promise<UploadableBundle> => ({
  registrationId: bundle.registrationId,
  identityPublicKey: await toB64(bundle.identity.publicKey),
  signedPreKey: {
    keyId: bundle.signedPreKey.keyId,
    publicKey: await toB64(bundle.signedPreKey.keyPair.publicKey),
    signature: await toB64(bundle.signedPreKey.signature),
  },
  oneTimePreKeys: await Promise.all(
    bundle.oneTimePreKeys.map(async (k) => ({
      keyId: k.keyId,
      publicKey: await toB64(k.keyPair.publicKey),
    })),
  ),
});

export const verifySignedPreKey = async (
  identityPublicKey: Uint8Array,
  signedPreKeyPublic: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> => {
  const s = await getSodium();
  try {
    return s.crypto_sign_verify_detached(
      signature,
      signedPreKeyPublic,
      identityPublicKey,
    );
  } catch {
    return false;
  }
};
