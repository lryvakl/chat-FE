# Secure Chat — End-to-End Encrypted Messenger

A full-stack, real-time messaging application with **client-side end-to-end encryption (E2EE)**.
Think of it as a self-hostable messenger: messages, media and reactions are
encrypted on the sender's device and can only be decrypted by the intended recipients. The
server stores and routes ciphertext only — it never sees plaintext message content and never
holds the keys needed to read it.

The project was built to demonstrate a complete, production-shaped E2EE chat system:
modern cryptographic protocols (X3DH + Double Ratchet for 1:1 chats, Sender Keys for groups),
real-time delivery over WebSockets, and a polished React client with offline-capable local
storage.

---

## What it does

- **1:1 and group conversations** with real-time delivery.
- **End-to-end encryption** of text, media and reactions — performed entirely in the browser.
- **Forward secrecy & post-compromise security** via the Double Ratchet algorithm.
- **Encrypted media** (images, voice messages, files) — uploaded and stored as ciphertext.
- **Presence & typing indicators**, read receipts, message editing & deletion, emoji reactions.
- **Encrypted key backup ("vault")** so a user can recover their identity/sessions on a new device with a recovery passphrase.
- **Rich UX**: themes & accent colors, 4 UI languages (English, Ukrainian, Polish, Japanese),
  an onboarding tour, profile customization, and an audio player for voice notes.

### Why E2EE matters here
The backend is intentionally "dumb" about content. All cryptographic operations (key
generation, key agreement, encryption, decryption) happen on the client using
[libsodium](https://libsodium.gitbook.io/). The server only ever stores:
- users' **public** key bundles (identity keys, signed prekeys, one-time prekeys),
- **ciphertext** payloads and routing metadata,
- an **encrypted** key vault that only the user's passphrase can unlock.

A compromised or malicious server cannot read message contents.

---

## Architecture

This repository is part of a two-service system:

```
course_work/
├── chat-FE/   ← React + TypeScript client (this folder)  — all crypto runs here
└── chat-BE/   ← NestJS + PostgreSQL server — stores ciphertext & public keys, routes messages
```

```
┌────────────────────┐        REST (HTTPS)        ┌────────────────────┐
│                    │  auth, keys, media, convs  │                    │
│   chat-FE (React)  │ ─────────────────────────► │  chat-BE (NestJS)  │
│                    │                            │                    │
│  • libsodium E2EE  │      WebSocket (Socket.IO) │  • REST + WS API   │
│  • Redux state     │ ◄────────────────────────► │  • PostgreSQL      │
│  • IndexedDB store │   live messages, presence  │    (TypeORM)       │
└────────────────────┘                            └────────────────────┘
```

---

## Cryptography overview

The client implements a Signal-protocol-style stack (`chat-FE/src/crypto/`):

| Concern | Mechanism | Files |
| --- | --- | --- |
| Identity | Long-term Ed25519 identity keypair per user | `identity.ts`, `primitives.ts` |
| Session setup (1:1) | **X3DH** (Extended Triple Diffie-Hellman) key agreement | `x3dh.ts` |
| Ongoing 1:1 messaging | **Double Ratchet** (DH ratchet + symmetric KDF chains, skipped-key handling) | `ratchet.ts`, `session.ts` |
| Group messaging | **Sender Keys** (per-sender chain keys distributed to members) | `senderKeys.ts`, `groupSession.ts` |
| Symmetric crypto | XChaCha20-Poly1305 AEAD, BLAKE2b KDFs | `primitives.ts`, `sodium.ts` |
| Media encryption | Per-file symmetric keys, encrypted before upload | `mediaCrypto.ts` |
| Key storage | Encrypted local key store in IndexedDB | `keyStore.ts`, `provisioning.ts` |
| Recovery | Encrypted "vault" backup unlocked by passphrase | `RecoveryGate.tsx`, vault APIs |

Supporting pieces: message envelopes (`messageEnvelope.ts`), local message/outbox caches
(`messageCache.ts`, `outboxCache.ts`), per-peer locking to serialize ratchet operations
(`peerLock.ts`), session reset with cooldown (`resetCooldown.ts`), and a "nuke" routine to
wipe local secrets (`nuke.ts`).

---

## Frontend (`chat-FE`)

A single-page application built with **React 19 + TypeScript + Vite**.

**Tech stack**
- **React 19**, **React Router 7**, **Redux Toolkit** + **redux-persist** for state
- **Vite 7** build tooling, **Vitest** for unit tests (incl. crypto specs & benchmarks)
- **Tailwind CSS 4** + **Radix UI** primitives for accessible UI, **lucide-react** icons
- **socket.io-client** for real-time transport, **axios** for REST
- **libsodium-wrappers-sumo** for cryptography, **idb** for IndexedDB
- **i18next / react-i18next** for localization, **driver.js** for the onboarding tour

**Structure (`src/`)**
- `crypto/` — the full E2EE stack (see table above) with tests in `crypto/__tests__/`
- `api/` — typed REST clients (auth, users, keys, conversations, media, pending sender keys)
- `websockets/` — `WebSocketManager` and `chatClient` for the Socket.IO connection
- `store/` — Redux slices (`auth`, `messages`, `conversations`, `presence`) and async thunks
- `pages/` — `LoginPage`, `RegisterPage`, `ChatPage`
- `components/` — UI: conversation list, message list/input, media & audio bubbles, emoji picker,
  members panel, modals (profile, new chat, appearance, chat settings), recovery gate, etc.
- `hooks/` — `useChat`, `useSocketLifecycle`, `useVoiceRecorder`, `useTour`, `useAccentColor`
- `theme/`, `preferences/` — theming and user preferences (React Context)
- `config/locales/` — translations for `en`, `uk`, `pl`, `ja`

**Routing**: guest routes (`/login`, `/register`) and protected routes (`/chat`, `/chat/:id`).
A `RecoveryGate` overlay prompts for the recovery passphrase when local keys are missing.

---

## Backend (`chat-BE`)

A **NestJS 11 + TypeScript** API backed by **PostgreSQL** via **TypeORM**, exposing both a
versioned REST API (prefix `/api`, default version `v1`) and a **Socket.IO** gateway for
real-time events. It is a **zero-knowledge relay**: it persists ciphertext and public keys but
never message plaintext or private keys.

**Tech stack**
- **NestJS 11** (`@nestjs/common`, `core`, `platform-express`, `websockets`, `platform-socket.io`)
- **PostgreSQL** + **TypeORM 0.3** (migrations included)
- **JWT auth** via `@nestjs/jwt` + Passport (`passport-jwt`), `bcrypt` for password hashing
- **class-validator / class-transformer** DTO validation (global `ValidationPipe`)
- **Swagger** (`@nestjs/swagger`) API docs
- **socket.io** with a JWT-guarded WebSocket gateway

**Modules (`src/`)**
- `auth/` — registration, login, JWT issuing/validation, WS JWT guard & strategy
- `user/` — user profiles (display name, avatar, customization)
- `keys/` — upload/serve public key bundles (identity, signed prekey, one-time prekeys) and the
  encrypted **vault backup**; hands out prekey bundles for X3DH session setup
- `chat/` — conversations & membership, messages (send/edit/delete), reactions, read receipts,
  **pending sender keys** for group key distribution, and the **`ChatGateway`** real-time hub
- `media/` — storage & retrieval of encrypted media blobs
- `migrations/` — schema evolution (initial schema → conversations → crypto keys → media →
  pending sender keys → reactions/customization → vault backup)

**Key entities**: `User`, `Conversation`, `ConversationMember`, `Message`, `MessageReaction`,
`MessageReceipt`, `PendingSenderKey`, `IdentityKey`, `SignedPreKey`, `OneTimePreKey`,
`VaultBackup`, `Media`.

**Real-time events** (`SocketEvent`): message send/receive, edit/delete, join/leave conversation,
typing/stop-typing, read receipts, presence updates, add/remove reactions, sender-key
distribution, session-reset requests, conversation/member lifecycle, and profile updates.

---

## Getting started

### Prerequisites
- **Node.js** ≥ 20
- **PostgreSQL** ≥ 14 running locally (or reachable)

### 1. Backend (`chat-BE`)

```bash
cd chat-BE
npm install
```

Create a `.env` file in `chat-BE/`:

```env
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=realtimechatdb
DB_USERNAME=admin
DB_PASSWORD=mypassword

# Auth — generate your own secret in production!
JWT_SECRET=replace-with-a-strong-random-secret
```

Create the database, run migrations, then start the server:

```bash
npm run migration:run     # apply TypeORM migrations
npm run start:dev         # watch mode on http://localhost:3000
```

- REST API base: `http://localhost:3000/api/v1`
- Swagger docs: `http://localhost:3000` (see `src/config/swagger.config.ts` for the exact path)

### 2. Frontend (`chat-FE`)

```bash
cd chat-FE
npm install
```

Create a `.env` file in `chat-FE/` pointing at the backend:

```env
VITE_SERVER_URL=http://localhost:3000
```

Start the dev server:

```bash
npm run dev               # Vite dev server (default http://localhost:5173)
```

Open the app, register two accounts (in separate browsers/profiles), start a conversation, and
messages will be end-to-end encrypted between them.

---

## Available scripts

### Frontend (`chat-FE`)
| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run test` | Run Vitest unit tests (includes crypto specs) |

### Backend (`chat-BE`)
| Script | Description |
| --- | --- |
| `npm run start` | Start NestJS in watch mode |
| `npm run test` | Run Jest unit / e2e tests |

---

## Security notes

- The server is designed as a **zero-knowledge relay**: it stores only ciphertext, public keys,
  and an encrypted key vault. Compromise of the server does not reveal message plaintext.
- The `.env` values shown above are **examples** — always use a strong, randomly generated
  `JWT_SECRET` and real database credentials in any non-local deployment.
- This is an academic / course project. Review and harden (TLS, key-rotation policy, rate
  limiting, storage hardening) before any real-world use.

---

## Tech summary

**Frontend:** React 19 · TypeScript · Vite · Redux Toolkit · Tailwind CSS 4 · Radix UI ·
Socket.IO client · libsodium · IndexedDB · i18next · Vitest

**Backend:** NestJS 11 · TypeScript · PostgreSQL · TypeORM · Socket.IO · JWT/Passport ·
class-validator · Swagger · Jest
