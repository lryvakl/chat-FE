import { generateIdentityBundle, toUploadableBundle } from './identity';
import {
  createVault,
  hasVault,
  persistVault,
  replenishOneTimePreKeys,
  requireVault,
  unlockVault,
} from './keyStore';
import { keysApi, type UploadBundlePayload } from '../api/keysApi';

const ONE_TIME_LOW_THRESHOLD = 20;
const ONE_TIME_REPLENISH_BATCH = 50;

export class MissingIdentityError extends Error {
  constructor() {
    super(
      'Your encryption keys live only on the device you registered from. ' +
        'Log in from that device, or reset your account (this will discard old chats).',
    );
    this.name = 'MissingIdentityError';
  }
}

const republishFromVault = async (token: string): Promise<void> => {
  const v = requireVault();
  const payload: UploadBundlePayload = {
    registrationId: v.registrationId,
    identityPublicKey: v.identity.publicKey,
    signedPreKey: {
      keyId: v.signedPreKey.keyId,
      publicKey: v.signedPreKey.publicKey,
      signature: v.signedPreKey.signature,
    },
    oneTimePreKeys: v.oneTimePreKeys.map((k) => ({
      keyId: k.keyId,
      publicKey: k.publicKey,
    })),
  };
  await keysApi.upload(payload, token);
};

const resetAndReprovision = async (
  userId: number,
  username: string,
  password: string,
  token: string,
): Promise<void> => {
  const { keysApi } = await import('../api/keysApi');
  await keysApi.reset(token);
  await provisionNewIdentity(userId, username, password, token);
};

export const provisionNewIdentity = async (
  userId: number,
  username: string,
  password: string,
  token: string,
): Promise<void> => {
  if (await hasVault(userId)) return;
  const bundle = await generateIdentityBundle();
  await createVault(userId, username, password, bundle);
  const uploadable = await toUploadableBundle(bundle);
  await keysApi.upload(uploadable, token);
};

export const ensureIdentityProvisioned = async (
  userId: number,
  username: string,
  password: string,
  token: string,
): Promise<void> => {
  if (await hasVault(userId)) {
    await unlockVault(userId, password);
    try {
      const counts = await keysApi.me(token);
      if (!counts.hasIdentity) {
        console.warn(
          'Server lost our identity; republishing from local vault.',
        );
        await republishFromVault(token);
      }
    } catch (err) {
      console.warn('Could not verify server-side identity:', err);
    }
  } else {
    const counts = await keysApi.me(token);
    if (counts.hasIdentity) {
      console.warn(
        'Local vault missing; performing fresh identity reset (old encrypted history will become unreadable).',
      );
      await resetAndReprovision(userId, username, password, token);
    } else {
      await provisionNewIdentity(userId, username, password, token);
    }
  }

  const counts = await keysApi.me(token);
  if (
    counts.hasIdentity &&
    counts.oneTimePreKeyCount < ONE_TIME_LOW_THRESHOLD
  ) {
    const fresh = await replenishOneTimePreKeys(ONE_TIME_REPLENISH_BATCH);
    await keysApi.replenish(fresh, token);
    await persistVault();
  }
};
