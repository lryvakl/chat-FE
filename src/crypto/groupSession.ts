import { fromB64, fromUtf8, toB64, utf8 } from './encoding';
import {
  deleteMySenderKey,
  deletePeerSenderKeysForGroup,
  loadMySenderKey,
  loadPeerSenderKey,
  persistVault,
  saveMySenderKey,
  savePeerSenderKey,
} from './keyStore';
import { groupReceiverKey, groupSenderKey, withLock } from './peerLock';
import {
  decryptWithSenderKey,
  encryptWithSenderKey,
  fromDistributionPayload,
  generateMySenderKey,
  toDistributionPayload,
  type GroupMessageHeader,
  type SenderKeyDistributionPayload,
} from './senderKeys';
import { encryptForPeer, decryptFromPeer } from './session';

export interface OutgoingGroupCiphertext {
  ciphertext: string;
  header: string;
  isEncrypted: true;
}

export interface OutgoingDistribution {
  recipientUserId: number;
  ciphertext: string;
  header: string;
}

const packCiphertext = async (
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Promise<string> => {
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, nonce.length);
  return toB64(combined);
};

const unpackCiphertext = async (
  b64: string,
): Promise<{ nonce: Uint8Array; ciphertext: Uint8Array }> => {
  const bytes = await fromB64(b64);
  return { nonce: bytes.slice(0, 24), ciphertext: bytes.slice(24) };
};

export const ensureMySenderKey = (
  groupId: number,
): Promise<{ created: boolean }> =>
  withLock(groupSenderKey(groupId), async () => {
    const existing = loadMySenderKey(groupId);
    if (existing) return { created: false };
    const fresh = await generateMySenderKey(groupId, 1);
    saveMySenderKey(fresh);
    await persistVault();
    return { created: true };
  });

export const distributeSenderKeyToMembers = (
  groupId: number,
  myUserId: number,
  memberUserIds: number[],
): Promise<OutgoingDistribution[]> =>
  withLock(groupSenderKey(groupId), async () => {
    const myKey = loadMySenderKey(groupId);
    if (!myKey)
      throw new Error('Sender key missing — call ensureMySenderKey first');

    const targets = memberUserIds.filter(
      (uid) => uid !== myUserId && !myKey.distributedTo.includes(uid),
    );
    if (targets.length === 0) return [];

    const payload: SenderKeyDistributionPayload = toDistributionPayload(myKey);
    const wirePayload = utf8(
      JSON.stringify({ kind: 'senderKeyDistribution', payload }),
    );

    const outs: OutgoingDistribution[] = [];
    const succeeded: number[] = [];
    for (const recipientUserId of targets) {
      try {
        const enc = await encryptForPeer(
          recipientUserId,
          fromUtf8(wirePayload),
        );
        outs.push({
          recipientUserId,
          ciphertext: enc.ciphertext,
          header: enc.header,
        });
        succeeded.push(recipientUserId);
      } catch (err) {
        console.warn(
          `Skipping sender-key distribution to user ${recipientUserId}:`,
          err,
        );
      }
    }

    const updated = {
      ...myKey,
      distributedTo: [...myKey.distributedTo, ...succeeded],
    };
    saveMySenderKey(updated);
    await persistVault();
    return outs;
  });

export const encryptForGroup = (
  groupId: number,
  myUserId: number,
  plaintext: string,
): Promise<OutgoingGroupCiphertext> =>
  withLock(groupSenderKey(groupId), async () => {
    const myKey = loadMySenderKey(groupId);
    if (!myKey)
      throw new Error('Cannot encrypt for group — sender key not initialised');
    const enc = await encryptWithSenderKey(myKey, myUserId, utf8(plaintext));
    saveMySenderKey(enc.updatedKey);
    await persistVault();
    return {
      ciphertext: await packCiphertext(enc.ciphertext, enc.nonce),
      header: JSON.stringify(enc.header),
      isEncrypted: true,
    };
  });

export const decryptGroupMessage = async (
  groupId: number,
  headerJson: string,
  ciphertextB64: string,
): Promise<string> => {
  const header = JSON.parse(headerJson) as GroupMessageHeader;
  return withLock(groupReceiverKey(groupId, header.senderUserId), async () => {
    const peerKey = loadPeerSenderKey(groupId, header.senderUserId);
    if (!peerKey) {
      throw new Error(
        `No sender key from user ${header.senderUserId} for group ${groupId}; awaiting distribution`,
      );
    }
    const { nonce, ciphertext } = await unpackCiphertext(ciphertextB64);
    const { plaintext, updatedKey } = await decryptWithSenderKey(
      peerKey,
      header,
      ciphertext,
      nonce,
    );
    savePeerSenderKey(updatedKey);
    await persistVault();
    return fromUtf8(plaintext);
  });
};

export const ingestDistribution = async (
  senderUserId: number,
  headerJson: string,
  ciphertextB64: string,
): Promise<void> => {
  const plaintext = await decryptFromPeer(
    senderUserId,
    headerJson,
    ciphertextB64,
  );
  const wrapper = JSON.parse(plaintext) as {
    kind: string;
    payload: SenderKeyDistributionPayload;
  };
  if (wrapper.kind !== 'senderKeyDistribution') {
    throw new Error('Unexpected distribution payload kind');
  }
  const peerKey = fromDistributionPayload(wrapper.payload, senderUserId);
  await withLock(groupReceiverKey(peerKey.groupId, senderUserId), async () => {
    savePeerSenderKey(peerKey);
    await persistVault();
  });
};

export const rotateMySenderKey = async (groupId: number): Promise<void> => {
  const current = loadMySenderKey(groupId);
  const nextChainId = (current?.chainId ?? 0) + 1;
  const fresh = await generateMySenderKey(groupId, nextChainId);
  saveMySenderKey(fresh);
  await persistVault();
};

export const wipeGroupSenderKeys = async (groupId: number): Promise<void> => {
  deleteMySenderKey(groupId);
  deletePeerSenderKeysForGroup(groupId);
  await persistVault();
};
