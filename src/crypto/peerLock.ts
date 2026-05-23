const tails = new Map<string, Promise<unknown>>();

export const withLock = async <T>(
  key: string,
  task: () => Promise<T>,
): Promise<T> => {
  const previous = tails.get(key) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  const swallowed = run.catch(() => undefined);
  tails.set(key, swallowed);
  try {
    return await run;
  } finally {
    if (tails.get(key) === swallowed) tails.delete(key);
  }
};

export const peerKey = (peerUserId: number): string => `peer:${peerUserId}`;
export const groupSenderKey = (groupId: number): string =>
  `group:mine:${groupId}`;
export const groupReceiverKey = (
  groupId: number,
  senderUserId: number,
): string => `group:peer:${groupId}:${senderUserId}`;
