const deleteDb = (name: string): Promise<void> =>
  new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });

export const wipeLocalCrypto = async (): Promise<void> => {
  await Promise.all([deleteDb('chat-keystore'), deleteDb('chat-msg-cache')]);
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
};
