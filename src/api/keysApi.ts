import http from './axios.instance';

export interface SignedPreKeyPayload {
  keyId: number;
  publicKey: string;
  signature: string;
}

export interface OneTimePreKeyPayload {
  keyId: number;
  publicKey: string;
}

export interface UploadBundlePayload {
  registrationId: number;
  identityPublicKey: string;
  signedPreKey: SignedPreKeyPayload;
  oneTimePreKeys: OneTimePreKeyPayload[];
}

export interface PeerBundle {
  userId: number;
  registrationId: number;
  identityPublicKey: string;
  signedPreKey: SignedPreKeyPayload;
  oneTimePreKey: OneTimePreKeyPayload | null;
}

export interface KeyCounts {
  hasIdentity: boolean;
  signedPreKeyId: number | null;
  oneTimePreKeyCount: number;
  hasVaultBackup: boolean;
}

export interface VaultBackupPayload {
  version: number;
  kdfSalt: string;
  kdfOps: number;
  kdfMem: number;
  nonce: string;
  ciphertext: string;
}

export interface VaultBackupResponse extends VaultBackupPayload {
  updatedAt: string;
}

const authHeader = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : undefined;

export const keysApi = {
  async upload(payload: UploadBundlePayload, token?: string) {
    const { data } = await http.post('keys/bundle', payload, {
      headers: authHeader(token),
    });
    return data as { ok: boolean; oneTimeCount: number };
  },
  async me(token?: string): Promise<KeyCounts> {
    const { data } = await http.get<KeyCounts>('keys/me', {
      headers: authHeader(token),
    });
    return data;
  },
  async peer(userId: number, token?: string): Promise<PeerBundle> {
    const { data } = await http.get<PeerBundle>(`keys/bundle/${userId}`, {
      headers: authHeader(token),
    });
    return data;
  },
  async replenish(oneTimePreKeys: OneTimePreKeyPayload[], token?: string) {
    const { data } = await http.post<{ added: number }>(
      'keys/prekeys',
      { oneTimePreKeys },
      { headers: authHeader(token) },
    );
    return data;
  },
  async reset(token?: string) {
    const { data } = await http.delete('keys/me', {
      headers: authHeader(token),
    });
    return data as { ok: boolean };
  },
  async rotateSignedPreKey(signedPreKey: SignedPreKeyPayload, token?: string) {
    const { data } = await http.post(
      'keys/signed-prekey',
      { signedPreKey },
      { headers: authHeader(token) },
    );
    return data;
  },
  async uploadVaultBackup(payload: VaultBackupPayload, token?: string) {
    const { data } = await http.post<{ ok: boolean }>(
      'keys/vault-backup',
      payload,
      { headers: authHeader(token) },
    );
    return data;
  },
  async downloadVaultBackup(
    token?: string,
  ): Promise<VaultBackupResponse | null> {
    try {
      const { data } = await http.get<VaultBackupResponse>(
        'keys/vault-backup',
        {
          headers: authHeader(token),
        },
      );
      return data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) return null;
      throw err;
    }
  },
  async deleteVaultBackup(token?: string) {
    const { data } = await http.delete('keys/vault-backup', {
      headers: authHeader(token),
    });
    return data as { ok: boolean };
  },
};
