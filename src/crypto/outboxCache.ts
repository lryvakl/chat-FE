const queues = new Map<number, string[]>();

export const pushOutgoing = (
  conversationId: number,
  plaintext: string,
): void => {
  const q = queues.get(conversationId) ?? [];
  q.push(plaintext);
  queues.set(conversationId, q);
};

export const popOutgoing = (conversationId: number): string | null => {
  const q = queues.get(conversationId);
  if (!q || q.length === 0) return null;
  const next = q.shift()!;
  if (q.length === 0) queues.delete(conversationId);
  return next;
};

export const clearOutgoing = (): void => queues.clear();
