const lastReset = new Map<number, number>();
const COOLDOWN_MS = 6_000;

export const shouldResetPeer = (peerUserId: number): boolean => {
  const t = lastReset.get(peerUserId);
  if (t !== undefined && Date.now() - t < COOLDOWN_MS) return false;
  lastReset.set(peerUserId, Date.now());
  return true;
};
