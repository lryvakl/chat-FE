import http from './axios.instance';

export interface PendingDistribution {
  id: number;
  senderUserId: number;
  conversationId: number;
  ciphertext: string;
  header: string;
  createdAt: string;
}

export const pendingSenderKeysApi = {
  async list(): Promise<PendingDistribution[]> {
    const { data } = await http.get<PendingDistribution[]>(
      'pending-sender-keys',
    );
    return data;
  },
  async ack(ids: number[]): Promise<{ deleted: number }> {
    if (ids.length === 0) return { deleted: 0 };
    const { data } = await http.post<{ deleted: number }>(
      'pending-sender-keys/ack',
      { ids },
    );
    return data;
  },
};
