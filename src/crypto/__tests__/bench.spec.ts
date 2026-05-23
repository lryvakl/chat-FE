/**
 * Мікробенчмарк криптографічних операцій.
 *
 * Запуск:  npx vitest run src/crypto/__tests__/bench.spec.ts
 *
 * Результати виводяться у консоль (vitest показує їх "as is"). Числа в мс/операцію
 * залежать від CPU, версії Node та активного навантаження.
 */
import { describe, it } from 'vitest';
import { getSodium } from '../sodium';
import { runX3dhInitiator, runX3dhResponder } from '../x3dh';
import {
  initInitiatorState,
  initResponderState,
  ratchetEncrypt,
  ratchetDecrypt,
} from '../ratchet';
import { deriveX3dhSecret, newDhKeyPair } from '../primitives';
import {
  generateMySenderKey,
  toDistributionPayload,
  fromDistributionPayload,
  encryptWithSenderKey,
  decryptWithSenderKey,
} from '../senderKeys';

const PAYLOAD_BYTES = 256;
const WARMUP = 20;

interface Sample {
  name: string;
  iterations: number;
  totalMs: number;
}

const fmt = (n: number) => n.toFixed(3).padStart(8, ' ');

async function bench(
  name: string,
  iterations: number,
  fn: () => Promise<unknown> | unknown,
): Promise<Sample> {
  // прогрів
  for (let i = 0; i < WARMUP; i++) await fn();
  // вимірювання
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) await fn();
  const totalMs = performance.now() - t0;
  return { name, iterations, totalMs };
}

function printTable(samples: Sample[]) {
  /* eslint-disable no-console */
  console.log('\n┌─ Crypto microbenchmark ────────────────────────────────────┐');
  console.log(`│  payload: ${PAYLOAD_BYTES} B, warmup: ${WARMUP} ops`);
  console.log('├──────────────────────────────────┬─────────┬───────────────┤');
  console.log('│ Operation                        │ ms/op   │ ops/s         │');
  console.log('├──────────────────────────────────┼─────────┼───────────────┤');
  for (const s of samples) {
    const perOp = s.totalMs / s.iterations;
    const ops = 1000 / perOp;
    console.log(
      `│ ${s.name.padEnd(32, ' ')} │ ${fmt(perOp)} │ ${ops
        .toFixed(0)
        .padStart(13, ' ')} │`,
    );
  }
  console.log('└──────────────────────────────────┴─────────┴───────────────┘\n');
}

describe('crypto microbenchmark', () => {
  it('measures X3DH, Double Ratchet and Sender Keys cost', async () => {
    const s = await getSodium();
    const samples: Sample[] = [];
    const payload = s.randombytes_buf(PAYLOAD_BYTES);

    // ── X3DH ────────────────────────────────────────────────────────────
    {
      const aliceIdent = s.crypto_sign_keypair();
      const bobIdent = s.crypto_sign_keypair();
      const bobSpk = s.crypto_box_keypair();
      const bobSpkSig = s.crypto_sign_detached(
        bobSpk.publicKey,
        bobIdent.privateKey,
      );
      const bobOpk = s.crypto_box_keypair();

      samples.push(
        await bench('X3DH initiator', 200, async () => {
          await runX3dhInitiator({
            myRegistrationId: 1,
            myIdentityEdPublic: aliceIdent.publicKey,
            myIdentityEdPrivate: aliceIdent.privateKey,
            peer: {
              registrationId: 2,
              identityEdPublic: bobIdent.publicKey,
              signedPreKey: {
                keyId: 1,
                publicKey: bobSpk.publicKey,
                signature: bobSpkSig,
              },
              oneTimePreKey: { keyId: 1, publicKey: bobOpk.publicKey },
            },
          });
        }),
      );

      // Заздалегідь будуємо валідний envelope, щоб responder мав що споживати
      const init = await runX3dhInitiator({
        myRegistrationId: 1,
        myIdentityEdPublic: aliceIdent.publicKey,
        myIdentityEdPrivate: aliceIdent.privateKey,
        peer: {
          registrationId: 2,
          identityEdPublic: bobIdent.publicKey,
          signedPreKey: {
            keyId: 1,
            publicKey: bobSpk.publicKey,
            signature: bobSpkSig,
          },
          oneTimePreKey: { keyId: 1, publicKey: bobOpk.publicKey },
        },
      });

      samples.push(
        await bench('X3DH responder', 200, async () => {
          await runX3dhResponder({
            myIdentityEdPrivate: bobIdent.privateKey,
            mySignedPreKeyPrivate: bobSpk.privateKey,
            myOneTimePreKeyPrivate: bobOpk.privateKey,
            envelope: init.envelope,
          });
        }),
      );
    }

    // ── Double Ratchet ─────────────────────────────────────────────────
    async function makePair() {
      const aliceIdent = s.crypto_box_keypair();
      const bobIdent = s.crypto_box_keypair();
      const bobSpk = await newDhKeyPair();
      const shared = await deriveX3dhSecret([
        s.crypto_scalarmult(aliceIdent.privateKey, bobSpk.publicKey),
        s.crypto_scalarmult(aliceIdent.privateKey, bobIdent.publicKey),
        s.crypto_scalarmult(bobSpk.privateKey, bobIdent.publicKey),
      ]);
      const alice = await initInitiatorState(
        shared,
        bobSpk.publicKey,
        aliceIdent.publicKey,
        bobIdent.publicKey,
      );
      const bob = initResponderState(
        shared,
        bobSpk,
        bobIdent.publicKey,
        aliceIdent.publicKey,
      );
      // ініціюємо отримуючий ланцюг у Bob
      const seed = await ratchetEncrypt(alice, new Uint8Array([0]));
      await ratchetDecrypt(bob, seed.header, seed.ciphertext, seed.nonce);
      return { alice, bob };
    }

    // ratchet-encrypt: Alice шифрує безперервно у власному send-ланцюзі
    {
      const { alice } = await makePair();
      samples.push(
        await bench('ratchet-encrypt (same chain)', 2000, async () => {
          await ratchetEncrypt(alice, payload);
        }),
      );
    }

    // ratchet-decrypt без DH-ratchet: Bob розшифровує підряд від того ж Alice
    {
      const { alice, bob } = await makePair();
      const N = 500;
      const total = N + WARMUP;
      const queue: Array<Awaited<ReturnType<typeof ratchetEncrypt>>> = [];
      for (let i = 0; i < total; i++) {
        queue.push(await ratchetEncrypt(alice, payload));
      }
      let idx = 0;
      samples.push(
        await bench('ratchet-decrypt (no DH-ratchet)', N, async () => {
          const m = queue[idx++];
          await ratchetDecrypt(bob, m.header, m.ciphertext, m.nonce);
        }),
      );
    }

    // ratchet-decrypt з DH-ratchet: pre-build пар, у кожній Bob уже відіслав
    // одне повідомлення з новим dhPub → Alice's decrypt тригерить DH-ratchet.
    {
      const N = 200;
      const total = N + WARMUP;
      const queue: Array<{
        alice: Awaited<ReturnType<typeof makePair>>['alice'];
        out: Awaited<ReturnType<typeof ratchetEncrypt>>;
      }> = [];
      for (let i = 0; i < total; i++) {
        const { alice, bob } = await makePair();
        const out = await ratchetEncrypt(bob, payload);
        queue.push({ alice, out });
      }
      let idx = 0;
      samples.push(
        await bench('ratchet-decrypt (with DH-ratchet)', N, async () => {
          const { alice, out } = queue[idx++];
          await ratchetDecrypt(alice, out.header, out.ciphertext, out.nonce);
        }),
      );
    }

    // ── Sender Keys ────────────────────────────────────────────────────
    {
      let my = await generateMySenderKey(1, 1);
      const peer = fromDistributionPayload(toDistributionPayload(my), 42);
      samples.push(
        await bench('sender-key encrypt', 2000, async () => {
          const o = await encryptWithSenderKey(my, 42, payload);
          my = o.updatedKey;
        }),
      );

      // Готуємо чергу зашифрованих повідомлень для decrypt-вимірювання
      let producer = await generateMySenderKey(2, 1);
      let consumer = fromDistributionPayload(
        toDistributionPayload(producer),
        7,
      );
      const N = 1000;
      const total = N + WARMUP;
      const stash: Array<Awaited<ReturnType<typeof encryptWithSenderKey>>> = [];
      for (let i = 0; i < total; i++) {
        const o = await encryptWithSenderKey(producer, 7, payload);
        stash.push(o);
        producer = o.updatedKey;
      }
      let i = 0;
      samples.push(
        await bench('sender-key decrypt', N, async () => {
          const m = stash[i++];
          const r = await decryptWithSenderKey(
            consumer,
            m.header,
            m.ciphertext,
            m.nonce,
          );
          consumer = r.updatedKey;
        }),
      );
      // запобігаємо "unused variable" попередженням
      void peer;
    }

    printTable(samples);
  }, 60_000);
});
