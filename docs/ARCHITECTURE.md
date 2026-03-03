# Vami — Full-Stack Architecture Overview

## What is Vami?

Vami is a real-time chat application built with:
- **Backend**: Node.js + Express (ESM), MongoDB, Redis, Socket.IO
- **Frontend**: Nuxt 3 (SPA mode), Pinia, Tailwind CSS v4, Socket.IO client
- **Storage**: MinIO (S3-compatible) for media uploads
- **Containerization**: Docker Compose for local development

---

## High-Level System Diagram

```
Browser (Nuxt 3 SPA)
        │
        │  HTTP (REST)  ─────────────────────────────────────────┐
        │  WebSocket (Socket.IO)                                  │
        ▼                                                         ▼
   nginx (port 80)                                    Express App (port 5000)
        │                                                         │
        ├──────────────────────────────────────────►  MongoDB (port 27017)
        │                                                         │
        └──────────────────────────────────────────►  Redis (port 6379)
                                                                  │
                                                    MinIO (port 9000)
```

---

## Technology Choices: Why?

| Technology | Why Used |
|---|---|
| **Node.js ESM** | Native ES Modules — `import/export` everywhere, no `require()` |
| **Express** | Minimal, well-understood HTTP framework |
| **MongoDB + Mongoose** | Flexible schema for chat messages, conversations, media metadata |
| **Redis (node-redis)** | JWT blacklist, rate-limit counters, user cache, pub/sub for Socket.IO clustering |
| **Socket.IO** | Bidirectional real-time events. Redis adapter enables multi-server scaling |
| **Nuxt 3 (SPA)** | Vue 3 Composition API + SSR disabled (chat is fully client-side) |
| **Pinia** | Lightweight Vue state management, composition API style |
| **Tailwind CSS v4** | Utility-first CSS via Vite plugin |
| **MinIO** | Local S3-compatible object storage — swap for AWS S3 in production by changing env vars only |
| **Zod** | Runtime request validation with TypeScript-like schema definitions |

---

## Request Lifecycle: REST

```
Browser
  │
  ├─► GET /api/v1/chats  (with Authorization: Bearer <access_token>)
  │
  ▼
Express app.js
  │
  ├─► cors()           — checks Origin header
  ├─► helmet()         — sets security headers
  ├─► express.json()   — parses JSON body
  ├─► cookieParser()   — parses cookies
  ├─► apiLimiter       — Redis-backed rate limit (10k req/min/IP)
  │
  ├─► /api/v1/chats  ──► chat.routes.js
  │                           │
  │                           ├─► protect()         — verifies JWT, attaches req.user
  │                           ├─► validate(schema)  — Zod schema validation
  │                           └─► controller()      — calls service, sends JSON
  │                                     │
  │                                     └─► service()  — business logic
  │                                               │
  │                                               ├─► repository()  — DB queries
  │                                               └─► cache.js      — Redis cache
  │
  └─► errorHandler  — catches any thrown ApiError, sends uniform JSON error
```

---

## Request Lifecycle: WebSocket

```
Browser (socket.io-client)
  │
  ├─► io.connect("ws://localhost:5000", { auth: { token } })
  │
  ▼
server.js → Socket.IO Server
  │
  ├─► socketAuth middleware  — verifies JWT, checks Redis cache for user
  │                            attaches socket.user
  │
  └─► chatSocket(io, socket)  — registers all event handlers
            │
            ├─► "join_room"       — verify participant, socket.join(roomId)
            ├─► "send_message"    — save to DB, io.to(roomId).emit("receive_message")
            ├─► "typing"          — socket.to(roomId).emit("user_typing")
            ├─► "react_to_message"
            ├─► "edit_message"
            ├─► "delete_message"
            └─► "disconnect"      — update presence → emit to all contacts
```

---

## Media Upload Flow (S3 Presigned URL)

```
MessageComposer.vue
        │
        │  1. POST /api/v1/uploads/presign  { mimetype, size }
        │     ← returns { uploadUrl, key, mediaUrl, expiresIn }
        │
        │  2. PUT <uploadUrl>  (direct upload to MinIO — bypasses Node.js)
        │     ← 200 from MinIO
        │
        │  3. POST /api/v1/uploads/confirm  { key }
        │     ← backend calls HeadObject to verify file exists
        │
        │  4. socket.emit("send_message", { ..., mediaKey: key, mediaUrl })
        │     ← message saved to DB with media fields
        └──── receive_message event delivered to all room participants
```

The file **never touches the Node.js process**. Node only generates the signed URL and later verifies the upload.

---

## Authentication Flow

```
Register / Login
  │
  ├─► Server generates:
  │     accessToken  (JWT, 15 min, only payload: { id })
  │     refreshToken (JWT, 7 days, payload: { id, type: "refresh", jti: uuid })
  │
  ├─► accessToken returned in response body  → stored in memory (Pinia token ref)
  └─► refreshToken set as HttpOnly cookie    → browser auto-sends on every request

Silent Token Refresh
  │
  ├─► Any 401 response (except /auth/*) triggers useApiFetch.js interceptor
  ├─► POST /api/v1/auth/refresh  (browser auto-sends cookie)
  │     Server: verifies refreshToken, checks JTI not blacklisted
  │     Server: blacklists old JTI, generates new token pair (rotation)
  └─► Retries original request with new accessToken

Logout
  └─► POST /api/v1/auth/logout  → JTI blacklisted in Redis → cookie cleared
```

---

## Redis Key Namespace

| Pattern | Purpose | TTL |
|---|---|---|
| `rt:bl:<jti>` | Blacklisted refresh token JTI | Remaining token lifetime |
| `ev:<token>` | Email verification token → userId | 24 hours |
| `user:<id>` | Cached user object | 5 minutes |
| `rl:auth:<ip>` | Auth rate-limit counter | 15 minutes window |
| `rl:api:<ip>` | API rate-limit counter | 1 minute window |

---

## MongoDB Collections

| Collection | Purpose |
|---|---|
| `users` | Accounts, profile, presence, blocked list |
| `conversations` | 1-on-1 and group chat metadata |
| `conversationparticipants` | Per-user settings (pin, archive, mute, unread) |
| `messages` | All chat messages with media fields, reactions, reply-to |
| `messagereceipts` | Per-user read/delivered receipts |
| `starredmessages` | Messages a user has starred |
| `statuses` | WhatsApp-style 24-hr status updates |
| `pushsubscriptions` | Web Push VAPID subscriptions per device |

---

## Environment Variables (Backend)

| Key | What it does |
|---|---|
| `PORT` | HTTP server port (default 5000) |
| `MONGO_URI` | MongoDB connection string (must include `?replicaSet=rs0` for transactions) |
| `REDIS_URL` | Redis connection string |
| `CLIENT_URL` | CORS allowed origin |
| `JWT_SECRET` | Secret for signing all JWTs |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |
| `VAPID_SUBJECT` | Web Push contact email |
| `S3_ENDPOINT` | MinIO/R2 endpoint (omit for real AWS) |
| `S3_REGION` | S3 region |
| `S3_ACCESS_KEY` | S3 access key ID |
| `S3_SECRET_KEY` | S3 secret key |
| `S3_BUCKET` | Default S3 bucket name |
| `CDN_URL` | Optional CDN prefix for media URLs |

---

## Docker Compose Services (dev)

| Service | Port | Purpose |
|---|---|---|
| `mongo` | 27018→27017 | MongoDB single-node replica set (required for transactions) |
| `mongo-init` | — | One-shot: calls `rs.initiate()` |
| `redis` | 6379 | Pub/sub + cache + rate limiting |
| `minio` | 9000 (API), 9001 (console) | S3-compatible object storage |
| `minio-init` | — | One-shot: creates `vami-media` bucket |
