import sodium from 'libsodium-wrappers-sumo';

let readyPromise: Promise<typeof sodium> | null = null;

export const getSodium = async (): Promise<typeof sodium> => {
  if (!readyPromise) {
    readyPromise = sodium.ready.then(() => sodium);
  }
  await readyPromise;
  return sodium;
};
