import { generateIdentityBundle, toUploadableBundle } from './identity';
import {
  createVault,
  exportEncryptedVault,
  hasVault,
  importEncryptedVault,
  persistVault,
  replenishOneTimePreKeys,
  requireVault,
  setBackupListener,
  unlockVault,
} from './keyStore';
import { keysApi, type UploadBundlePayload } from '../api/keysApi';

const ONE_TIME_LOW_THRESHOLD = 20;
const ONE_TIME_REPLENISH_BATCH = 50;
const BACKUP_DEBOUNCE_MS = 1500;

export class MissingIdentityError extends Error {
  constructor() {
    super(
      'Your encryption keys live only on the device you registered from, ' +
        'and no encrypted backup was found on the server. ' +
        'Log in from that device, or reset your account (this will discard old chats).',
    );
    this.name = 'MissingIdentityError';
  }
}

export class VaultRestoreFailedError extends Error {
  constructor() {
    super(
      'Could not decrypt the encrypted vault backup. ' +
        'Most likely the password is wrong — please try again.',
    );
    this.name = 'VaultRestoreFailedError';
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

let backupTimer: ReturnType<typeof setTimeout> | null = null;
let backupInFlight = false;
let backupAgainAfter = false;
let activeToken: string | null = null;
let activeUserId: number | null = null;

const flushBackup = async (): Promise<void> => {
  if (activeUserId === null || !activeToken) return;
  if (backupInFlight) {
    backupAgainAfter = true;
    return;
  }
  const blob = await exportEncryptedVault(activeUserId);
  if (!blob) return;
  backupInFlight = true;
  try {
    await keysApi.uploadVaultBackup(
      {
        version: blob.version,
        kdfSalt: blob.kdfSalt,
        kdfOps: blob.kdfOps,
        kdfMem: blob.kdfMem,
        nonce: blob.nonce,
        ciphertext: blob.ciphertext,
      },
      activeToken,
    );
  } catch (err) {
    console.warn('Vault backup upload failed:', err);
  } finally {
    backupInFlight = false;
    if (backupAgainAfter) {
      backupAgainAfter = false;
      scheduleBackup();
    }
  }
};

const scheduleBackup = (): void => {
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    backupTimer = null;
    void flushBackup();
  }, BACKUP_DEBOUNCE_MS);
};

const installBackupListener = (userId: number, token: string): void => {
  activeUserId = userId;
  activeToken = token;
  setBackupListener(() => scheduleBackup());
};

const resetAndReprovision = async (
  userId: number,
  username: string,
  password: string,
  token: string,
): Promise<void> => {
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

const tryRestoreFromBackup = async (
  userId: number,
  username: string,
  password: string,
  token: string,
): Promise<boolean> => {
  const backup = await keysApi.downloadVaultBackup(token);
  if (!backup) return false;
  await importEncryptedVault(userId, username, {
    version: 1,
    kdfSalt: backup.kdfSalt,
    kdfOps: backup.kdfOps,
    kdfMem: backup.kdfMem,
    nonce: backup.nonce,
    ciphertext: backup.ciphertext,
  });
  try {
    await unlockVault(userId, password);
  } catch (err) {
    console.warn('Vault backup decryption failed:', err);
    throw new VaultRestoreFailedError();
  }
  return true;
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
      if (counts.hasVaultBackup) {
        const restored = await tryRestoreFromBackup(
          userId,
          username,
          password,
          token,
        );
        if (!restored) {
          throw new MissingIdentityError();
        }
      } else {
        throw new MissingIdentityError();
      }
    } else {
      await provisionNewIdentity(userId, username, password, token);
    }
  }

  installBackupListener(userId, token);

  const counts = await keysApi.me(token);
  if (
    counts.hasIdentity &&
    counts.oneTimePreKeyCount < ONE_TIME_LOW_THRESHOLD
  ) {
    const fresh = await replenishOneTimePreKeys(ONE_TIME_REPLENISH_BATCH);
    await keysApi.replenish(fresh, token);
    await persistVault();
  }

  if (!counts.hasVaultBackup) {
    await flushBackup();
  }
};

export const clearBackupSubscription = (): void => {
  setBackupListener(null);
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }
  activeToken = null;
  activeUserId = null;
  backupAgainAfter = false;
};
