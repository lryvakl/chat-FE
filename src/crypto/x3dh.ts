import { fromB64, toB64 } from './encoding';
import {
  deriveX3dhSecret,
  edPrivToX25519,
  edPubToX25519,
  newDhKeyPair,
  verifyEd25519,
  x25519Dh,
} from './primitives';

export interface PrekeyEnvelope {
  registrationId: number;
  identityKey: string;
  ephemeralKey: string;
  signedPreKeyId: number;
  oneTimePreKeyId: number | null;
}

export interface InitiatorResult {
  sharedSecret: Uint8Array;
  envelope: PrekeyEnvelope;
  peerIdentityX: Uint8Array;
}

export interface InitiatorInputs {
  myRegistrationId: number;
  myIdentityEdPublic: Uint8Array;
  myIdentityEdPrivate: Uint8Array;
  peer: {
    registrationId: number;
    identityEdPublic: Uint8Array;
    signedPreKey: {
      keyId: number;
      publicKey: Uint8Array;
      signature: Uint8Array;
    };
    oneTimePreKey: { keyId: number; publicKey: Uint8Array } | null;
  };
}

export const runX3dhInitiator = async (
  input: InitiatorInputs,
): Promise<InitiatorResult> => {
  const sigOk = await verifyEd25519(
    input.peer.signedPreKey.publicKey,
    input.peer.signedPreKey.signature,
    input.peer.identityEdPublic,
  );
  if (!sigOk) {
    throw new Error(
      'Signed prekey signature is invalid — possible MITM attempt by the server',
    );
  }

  const myIdentityX = await edPrivToX25519(input.myIdentityEdPrivate);
  const peerIdentityX = await edPubToX25519(input.peer.identityEdPublic);
  const ephemeral = await newDhKeyPair();

  const dh1 = await x25519Dh(myIdentityX, input.peer.signedPreKey.publicKey);
  const dh2 = await x25519Dh(ephemeral.privateKey, peerIdentityX);
  const dh3 = await x25519Dh(
    ephemeral.privateKey,
    input.peer.signedPreKey.publicKey,
  );

  const parts = [dh1, dh2, dh3];
  if (input.peer.oneTimePreKey) {
    const dh4 = await x25519Dh(
      ephemeral.privateKey,
      input.peer.oneTimePreKey.publicKey,
    );
    parts.push(dh4);
  }
  const sharedSecret = await deriveX3dhSecret(parts);

  const envelope: PrekeyEnvelope = {
    registrationId: input.myRegistrationId,
    identityKey: await toB64(input.myIdentityEdPublic),
    ephemeralKey: await toB64(ephemeral.publicKey),
    signedPreKeyId: input.peer.signedPreKey.keyId,
    oneTimePreKeyId: input.peer.oneTimePreKey?.keyId ?? null,
  };

  return { sharedSecret, envelope, peerIdentityX };
};

export interface ResponderInputs {
  myIdentityEdPrivate: Uint8Array;
  mySignedPreKeyPrivate: Uint8Array;
  myOneTimePreKeyPrivate: Uint8Array | null;
  envelope: PrekeyEnvelope;
}

export interface ResponderResult {
  sharedSecret: Uint8Array;
  peerIdentityX: Uint8Array;
  peerEphemeralX: Uint8Array;
}

export const runX3dhResponder = async (
  input: ResponderInputs,
): Promise<ResponderResult> => {
  const peerIdentityEd = await fromB64(input.envelope.identityKey);
  const peerEphemeral = await fromB64(input.envelope.ephemeralKey);

  const myIdentityX = await edPrivToX25519(input.myIdentityEdPrivate);
  const peerIdentityX = await edPubToX25519(peerIdentityEd);

  const dh1 = await x25519Dh(input.mySignedPreKeyPrivate, peerIdentityX);
  const dh2 = await x25519Dh(myIdentityX, peerEphemeral);
  const dh3 = await x25519Dh(input.mySignedPreKeyPrivate, peerEphemeral);

  const parts = [dh1, dh2, dh3];
  if (input.envelope.oneTimePreKeyId !== null && input.myOneTimePreKeyPrivate) {
    const dh4 = await x25519Dh(input.myOneTimePreKeyPrivate, peerEphemeral);
    parts.push(dh4);
  }

  const sharedSecret = await deriveX3dhSecret(parts);
  return { sharedSecret, peerIdentityX, peerEphemeralX: peerEphemeral };
};
