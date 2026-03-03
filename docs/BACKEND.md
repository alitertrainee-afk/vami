# Vami Backend — Complete Code Documentation

## Directory Structure

```
vami-backend/
├── server.js                    ← Entry point: HTTP + Socket.IO bootstrap
├── package.json
├── .env
└── src/
    ├── app.js                   ← Express app configuration
    ├── config/
    │   ├── database.config.js   ← MongoDB connection
    │   ├── redis.config.js      ← Redis pub/sub clients
    │   └── s3.config.js         ← S3/MinIO client
    ├── controllers/             ← HTTP request handlers (thin layer)
    │   ├── auth.controller.js
    │   ├── chat.controller.js
    │   ├── message.controller.js
    │   ├── user.controller.js
    │   ├── upload.controller.js
    │   ├── status.controller.js
    │   └── push.controller.js
    ├── middleware/
    │   ├── auth.middleware.js   ← JWT protect() for HTTP routes
    │   ├── socket.auth.js       ← JWT authentication for Socket.IO
    │   ├── error.middleware.js  ← Global Express error handler
    │   ├── ratelimit.middleware.js ← Redis-backed rate limiting
    │   └── validate.middleware.js  ← Zod schema validation
    ├── models/                  ← Mongoose schemas
    │   ├── User.js
    │   ├── Conversation.js
    │   ├── ConversationParticipant.js
    │   ├── Message.js
    │   ├── MessageReceipt.js
    │   ├── StarredMessage.js
    │   ├── Status.js
    │   └── PushSubscription.js
    ├── repository/              ← Raw DB query functions
    │   ├── user.repository.js
    │   ├── conversation.repository.js
    │   ├── participant.repository.js
    │   └── message.repository.js
    ├── routes/                  ← Express router definitions
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── chat.routes.js
    │   ├── message.routes.js
    │   ├── upload.routes.js
    │   ├── status.routes.js
    │   └── push.routes.js
    ├── services/                ← Business logic layer
    │   ├── auth.service.js
    │   ├── user.service.js
    │   ├── chat.service.js
    │   ├── message.service.js
    │   ├── upload.service.js
    │   ├── status.service.js
    │   └── push.service.js
    ├── sockets/
    │   └── chat.socket.js       ← All Socket.IO event handlers
    ├── utils/
    │   ├── ApiError.js          ← Custom error class
    │   ├── ApiResponse.js       ← Uniform response shape
    │   ├── asyncHandler.js      ← Wraps async controllers
    │   ├── cache.js             ← Redis get/set/del helpers
    │   ├── jwt.utils.js         ← Token generation/verification
    │   ├── responseHandler.js   ← sendResponse() helper
    │   └── socketEmitter.js     ← Singleton to emit from services
    └── validators/              ← Zod schemas for request validation
        ├── auth.validator.js
        ├── chat.validator.js
        ├── group.validator.js
        ├── message.validator.js
        ├── user.validator.js
        └── upload.validator.js
```

---

## Entry Point: `server.js`

**Purpose**: Creates the HTTP server, wires Socket.IO with a Redis adapter (for horizontal scaling), and starts listening.

**Execution Order:**
1. Imports `app` (Express) and `connectRedis`
2. Creates `http.Server` around the Express app
3. Calls `connectRedis()` — MUST complete before anything else because:
   - RedisStore for rate limiting calls `SCRIPT LOAD` on construction
   - Socket.IO Redis adapter needs connected clients
4. Creates `Socket.IO Server` with CORS and Redis adapter
5. Calls `initSocketEmitter(io)` — stores `io` in a module-level singleton so services can emit events without circular imports
6. Registers `socketAuth` as Socket.IO middleware (runs before every `connection`)
7. On `connection`: logs the user, calls `chatSocket(io, socket)` to register all event handlers
8. Starts HTTP server on `PORT`

**Key design decision — why `http.createServer(app)` and not `app.listen()`?**
Socket.IO needs the raw `http.Server` instance, not Express. `app.listen()` internally creates one too but returns it — using the explicit pattern makes the dependency clear.

---

## `src/app.js` — Express Application

**Purpose**: Configures all HTTP middleware and mounts route prefixes.

**Middleware stack (in order):**

| Middleware | What it does |
|---|---|
| `cors()` | Allows requests from `CLIENT_URL` with credentials (cookies) |
| `express.json()` | Parses `application/json` request bodies |
| `helmet()` | Sets 15+ HTTP security headers (CSP, X-Frame-Options, etc.) |
| `cookieParser()` | Parses `Cookie` headers into `req.cookies` |
| `express.urlencoded()` | Parses `application/x-www-form-urlencoded` bodies |
| `apiLimiter` | Redis rate limit: 10,000 req/min per IP |

**Route mounting:**

| Prefix | File | What it handles |
|---|---|---|
| `/api/v1/auth` | `auth.routes.js` | register, login, logout, refresh, email verify |
| `/api/v1/users` | `user.routes.js` | profile, search, block, presence |
| `/api/v1/chats` | `chat.routes.js` | conversations, group management |
| `/api/v1/messages` | `message.routes.js` | CRUD messages, reactions, starred |
| `/api/v1/uploads` | `upload.routes.js` | presigned URLs, confirm upload |
| `/api/v1/statuses` | `status.routes.js` | status stories |
| `/api/v1/push` | `push.routes.js` | Web Push subscriptions |

**Error Handler**: Mounted last — catches anything `next(err)` propagates.

---

## `src/config/database.config.js`

Simple Mongoose connection. Calls `mongoose.connect(MONGO_URI)` and exits the process on failure. Called once inside `app.js` synchronously (Mongoose buffers queries until connected).

**Why replica set in MONGO_URI?**
MongoDB replica set is required for **transactions** (used in group chat creation to atomically create the conversation + participant records). In dev, `docker-compose.dev.yml` starts a single-node replica set with `--replSet rs0`.

---

## `src/config/redis.config.js`

Creates **two** Redis clients from the same connection string:
- `pubClient` — used for: cache operations, rate limiting, blacklist, emitting via Socket.IO adapter
- `subClient` — duplicate of pub, used only by Socket.IO adapter for subscribing to cross-server events

**Why two clients?**
A Redis client in subscriber mode cannot issue regular commands. Socket.IO's Redis adapter needs one client for publishing and a separate one for subscribing.

Both clients are exported as named exports so they can be imported anywhere without re-connecting.

---

## `src/config/s3.config.js`

Creates an `S3Client` (AWS SDK v3). Configuration:
- `region` from `S3_REGION` env var
- `endpoint` from `S3_ENDPOINT` (only set for MinIO/R2 — omit for real AWS S3)
- `credentials` from `S3_ACCESS_KEY` / `S3_SECRET_KEY`
- `forcePathStyle: true` when using a custom endpoint — MinIO requires path-style URLs (`http://host/bucket/key`) vs the AWS-default virtual-hosted style (`http://bucket.host/key`)

Exports `s3Client` (default) and `S3_BUCKET` (named).

---

## Middleware

### `auth.middleware.js` — `protect()`

**Flow:**
1. Reads `Authorization: Bearer <token>` header
2. Splits out the token and calls `verifyJWTToken(token)` — returns decoded payload or null
3. Uses the decoded `id` to fetch the user from DB via `findUserById()`
4. Attaches `req.user = user` — every downstream handler has the full user object
5. Any failure → `next(new ApiError(401, ...))`

**Why not cache here?**
The HTTP `protect` middleware does not cache because HTTP requests are stateless and caching adds complexity. The socket auth middleware does cache because socket connections are long-lived and create many events.

---

### `socket.auth.js` — `socketAuth`

Socket.IO middleware runs once per connection handshake.

**Flow:**
1. Reads `socket.handshake.auth.token`
2. Verifies JWT
3. Checks Redis cache (`user:<id>`) — avoids a DB hit on every socket reconnect
4. If not cached, fetches from DB and caches for 5 minutes
5. Attaches `socket.user = user`

---

### `ratelimit.middleware.js`

**The lazy-singleton pattern:**
```
makeLimiter() returns a middleware function.
That function holds `instance = null` in closure.
On first request, it creates the rateLimit() instance (which creates RedisStore).
All subsequent requests reuse the cached instance.
```

**Why lazy?**
`rate-limit-redis` v4 calls `SCRIPT LOAD` in the `RedisStore` constructor. This is a Redis command that requires the client to be connected. At module-import time (when `app.js` loads), Redis is not yet connected — connection happens asynchronously in `server.js`. The lazy pattern defers construction until the first HTTP request arrives, by which point Redis is guaranteed connected.

**Two separate limiters with different prefixes:**
- `authLimiter` (`rl:auth:`) — 50 req per 15 min — applied only to auth routes
- `apiLimiter` (`rl:api:`) — 10,000 req per 1 min — applied globally in `app.js`

Without separate prefixes, both counters would share Redis keys and the lower limit would always win.

---

### `validate.middleware.js`

Wraps any Zod schema into Express middleware.

**How it works:**
1. Calls `schema.parse({ body, params, query })` — Zod validates all three at once
2. On success: attaches `req.validatedData` and calls `next()`
3. On `ZodError`: maps all errors into a human-readable string and calls `next(new ApiError(400, message))`

All route schemas are defined as `z.object({ body: z.object({...}), params: ..., query: ... })` so the top-level keys match what `validate()` passes.

---

### `error.middleware.js`

Global Express error handler (4 parameters: `err, req, res, next`).

**Flow:**
1. If `err` is not already an `ApiError`, wrap it:
   - Check `err.statusCode` or default to 400 (Mongoose errors) or 500
2. Build response object from the error
3. In development: include `stack` trace in response
4. Call `sendResponse(res, statusCode, message, errorData)`

This is deliberately the **last** middleware in `app.js` so it catches errors from all routes.

---

## Utils

### `ApiError.js`
Custom error class extending `Error`. Extra fields: `statusCode`, `success: false`, `data: null`, `errors[]`. All service and controller code throws `new ApiError(statusCode, message)`.

### `ApiResponse.js`
Plain class. Fields: `statusCode`, `data`, `message`, `success` (true when statusCode < 400). Every successful response has this shape.

### `asyncHandler.js`
```js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```
Wraps async controller functions so unhandled promise rejections are forwarded to `next(err)` automatically. Without this, an `await` failure in a controller would just hang the request.

### `responseHandler.js`
`sendResponse(res, statusCode, message, data)` — creates an `ApiResponse` and sends it as JSON. Centralizes all HTTP response formatting.

### `jwt.utils.js`
Three functions:
- `generateJti()` — `crypto.randomUUID()` — a UUID used as the unique identifier for refresh tokens
- `generateToken(payload, time)` — `jwt.sign()` with `JWT_SECRET`
- `verifyJWTToken(token)` — `jwt.verify()`, returns null (not throwing) on failure

### `cache.js`
All Redis operations guard with try/catch and silently fail — cache is never required for correctness, only for performance.

| Function | What it does |
|---|---|
| `cacheGet(key)` | `GET key` → JSON parse |
| `cacheSet(key, value, ttl)` | `SET key value EX ttl` |
| `cacheDel(key)` | `DEL key` |
| `cacheDelPattern(pattern)` | Iterative `SCAN` + `DEL` — never uses `KEYS` (which would block Redis on large datasets) |
| `blacklistRefreshToken(jti, ttl)` | `SET rt:bl:<jti> 1 EX ttl` |
| `isRefreshTokenBlacklisted(jti)` | `GET rt:bl:<jti>` → not null |

---

## Models

### `User.js`
```
username    — unique, lowercase, indexed
email       — unique, indexed
password    — bcrypt hashed, select: false by default
isOnline    — boolean, updated on socket connect/disconnect
profile     — { avatar: String, bio: String }
blockedUsers — [ObjectId ref User]
```
**Instance method**: `isPasswordCorrect(password)` — `bcrypt.compare(password, this.password)`
**Pre-save hook**: hashes `password` when modified using bcrypt with 10 rounds.

### `Conversation.js`
```
chatName            — for group chats
isGroupChat         — boolean (false = 1-on-1)
participants        — [ObjectId ref User]
latestMessage       — ObjectId ref Message
lastMessageAt       — Date (for sidebar sorting)
groupAdmin          — ObjectId ref User (legacy, single)
admins              — [ObjectId ref User] (multi-admin, Phase 4)
description         — String
groupAvatar         — String (S3 key or URL)
onlyAdminsCanMessage — boolean
inviteToken         — unique String for invite links
```

### `ConversationParticipant.js`
Per-user metadata for a conversation. Separate collection avoids embedding user settings inside Conversation.
```
conversation   — ObjectId
user           — ObjectId
isPinned       — boolean
isArchived     — boolean
isMuted        — boolean
muteExpiresAt  — Date (null = indefinite)
unreadCount    — Number
```

### `Message.js`
The core data model. Every field:
```
conversation   — ObjectId (indexed)
sender         — ObjectId ref User
content        — String (optional for media messages)
type           — enum: text | image | video | audio | document | voice (default: text)
status         — enum: sent | delivered | read (default: sent)
replyTo        — ObjectId ref Message (for quote replies)
reactions      — [{ user: ObjectId, emoji: String }] (one per user, upserted)
isEdited       — boolean
editedAt       — Date
isDeleted      — boolean (for "deleted for everyone")
deletedFor     — [ObjectId] (for "deleted for me")
disappearsAt   — Date (TTL index — MongoDB auto-deletes when reached)
mediaKey       — S3 object key
mediaUrl       — Public URL
mediaMimeType  — MIME type string
mediaSize      — bytes
mediaDuration  — seconds (audio/video/voice)
thumbnailKey   — S3 key for generated thumbnail
thumbnailUrl   — Public URL for thumbnail
```

**Indexes:**
- `{ conversation: 1, createdAt: -1 }` — primary fetch (newest messages first)
- `{ disappearsAt: 1 } sparse TTL` — MongoDB auto-delete

### `MessageReceipt.js`
Per-message, per-user read/delivered status. Used for double-tick logic.
```
message        — ObjectId
user           — ObjectId
status         — enum: delivered | read
```
Unique compound index on `(message, user)` prevents duplicates.

### `StarredMessage.js`
Simple join table: `{ user, message, conversationId }` with unique `(user, message)` index.

### `Status.js`
```
user           — ObjectId
type           — enum: text | image | video
content        — text content
mediaUrl       — for image/video
privacy        — enum: all | contacts | none (default: all)
views          — [{ user: ObjectId, viewedAt: Date }]
expiresAt      — Date (MongoDB TTL index, 24 hours after creation)
```

### `PushSubscription.js`
```
user           — ObjectId
subscription   — Object (the PushSubscription from browser Push API)
deviceLabel    — String
```
Index: `{ user: 1 }` for fast lookup of all subscriptions belonging to a user.

---

## Repository Layer

Repositories are pure database functions. They never contain business logic — that lives in services. This separation means if you need to switch from Mongoose to Prisma, you only change repository files.

### `user.repository.js`
- `findUserByEmailOrUsername({ email, username }, select?)` — used for login/registration
- `createUser({ username, email, password })` — creates User document
- `findUserById(id)` — by MongoDB ObjectId
- `updateUserById(id, updates)` — profile updates, presence
- `searchUsers(query, currentUserId)` — regex search, excludes self
- `isBlockedByUser(userId, targetId)` — checks blockedUsers array
- `blockUser(userId, targetId)` — `$addToSet`
- `unblockUser(userId, targetId)` — `$pull`
- `verifyUserEmail(userId)` — sets `isEmailVerified: true`

### `conversation.repository.js`
- `findOneOnOneChat(userId, otherUserId)` — find existing 1-on-1
- `createOneOnOneChat(userId, otherUserId)` — atomic (MongoDB transaction): creates Conversation + 2 ConversationParticipant records
- `createGroupChat({ chatName, participants, adminId })` — transaction: Conversation + N participants
- `findUserChats(userId)` — all conversations a user is in, populated with latestMessage and participant info
- `findConversationById(chatId)` — single conversation with participants populated
- `updateConversation(chatId, updates)` — generic update

### `participant.repository.js`
- `findUserParticipantRecords(userId)` — all ConversationParticipant records for a user (for unread counts, pin/archive/mute)
- `createParticipants(chatId, userIds, session)` — bulk insert, used in transaction
- `addParticipant(chatId, userId)` — add member
- `removeParticipant(chatId, userId)` — delete participant record
- `updateParticipantSetting(userId, chatId, settings)` — pin/archive/mute
- `incrementUnreadForOthers(chatId, senderId)` — `$inc unreadCount` for all participants except sender
- `resetUnreadCount(userId, chatId)` — when user opens chat

### `message.repository.js`
- `findMessages({ chatId, skip, limit, sort, currentUserId })` — paginated messages, filters `isDeleted: false` and `deletedFor: { $ne: userId }`, populates `sender` and `replyTo`
- `countMessages(chatId, currentUserId)` — for pagination metadata
- `insertMessage({...})` — creates a Message document with all fields
- `findMessageById(messageId)` — single message with sender populated
- `upsertReaction(messageId, userId, emoji)` — either updates existing reaction or pushes new one. Empty emoji removes the reaction
- `editMessageContent(messageId, newContent)` — sets `isEdited: true`, `editedAt: now`
- `softDeleteForEveryone(messageId)` — sets `isDeleted: true`, `content: "This message was deleted"`
- `softDeleteForUser(messageId, userId)` — pushes userId to `deletedFor`
- `markMessagesDelivered(messageIds, userId)` — updates MessageReceipt records
- `markMessagesRead(messageIds, userId)` — updates MessageReceipt records
- `bulkMarkDelivered({ conversationId, userId })` — finds all undelivered messages in a conversation and marks them

---

## Service Layer

Services contain all business logic. They call repositories, throw `ApiError` for invalid states, and never directly touch `req`/`res`.

### `auth.service.js`

**`registerUserService({ username, email, password })`**
1. Validates no empty fields
2. Checks uniqueness via `findUserByEmailOrUsername`
3. Creates user
4. Generates email verification token (32 random bytes → hex), stores in Redis (`ev:<token>` → userId, 24h TTL)
5. Fires `sendVerificationEmail()` as fire-and-forget (never blocks registration)
6. Generates token pair (accessToken + refreshToken with JTI)
7. Returns `{ user, accessToken, refreshToken }`

**`loginUserService({ email, username, password })`**
1. Requires email or username
2. Fetches user with `select: "+password"` (password is hidden by default)
3. Calls `user.isPasswordCorrect(password)` (bcrypt.compare)
4. Strips password from response object using `toObject()` + `delete`
5. Generates token pair
6. Returns `{ user, accessToken, refreshToken }`

**`refreshTokenService(rawRefreshToken)`**
1. Decodes token, checks `type === "refresh"` and `jti` present
2. Checks JTI against Redis blacklist — if blacklisted, rejects (prevents replay attacks: each refresh token is one-time-use)
3. Fetches user
4. Blacklists the old JTI with its remaining TTL (auto-expires in Redis)
5. Generates a fresh token pair
6. Returns `{ user, accessToken, refreshToken }`

**`logoutService(rawRefreshToken)`**
Blacklists the JTI. Silent no-op if token is missing/invalid.

**`verifyEmailService(token)`**
1. Gets userId from Redis (`ev:<token>`)
2. Calls `verifyUserEmail(userId)`
3. Deletes the token from Redis (one-time use)

---

### `message.service.js`

**`sendMessageService({senderId, chatId, content, type, replyToId, mediaKey, mediaUrl, mediaMimeType, mediaSize, mediaDuration})`**
1. Validates: chatId required, either content or mediaKey required
2. Calls `insertMessage()` to create the DB record
3. If media message: fire-and-forget `enqueueMediaProcessing()` for thumbnail generation
4. Updates `conversation.latestMessage` and `lastMessageAt`
5. Increments unread count for all OTHER participants
6. Fire-and-forget: sends Web Push to offline participants

**`getAllMessagesService(chatId, query, currentUserId)`**
Paginates messages with cursor-based pagination. Resets unread count to 0 for this user when messages are fetched.

**`reactToMessageService({ messageId, emoji, userId })`**
Calls `upsertReaction()`. Empty emoji = remove reaction.

**`editMessageService({ messageId, newContent, userId })`**
Validates user is the sender. Calls `editMessageContent()`.

**`deleteMessageService({ messageId, userId, scope })`**
- `scope: "me"` → soft-delete for this user only
- `scope: "everyone"` → replaces content, sets `isDeleted: true` (only sender can do this)

**`markDeliveredService / markReadService / bulkMarkDeliveredService`**
Update MessageReceipt records and update the message `status` field.

---

### `chat.service.js`

**`accessChatService({ userId, currentUserId })`**
1. Block check: neither party has blocked the other
2. Try to find existing 1-on-1 chat
3. If not found: create new chat (transaction)

**`createGroupChatService({ chatName, participants, adminId })`**
1. Validates at least 2 other participants
2. Deduplicates participants, ensures admin is included
3. Creates group with MongoDB transaction

**Group management services** (all check that caller is an admin):
- `addMemberService` — adds participant record
- `removeMemberService` — removes participant record
- `leaveGroupService` — if last admin leaves, promotes another member
- `updateGroupInfoService` — name, description, avatar
- `promoteAdminService / demoteAdminService` — modifies `admins[]`
- `generateInviteLinkService` — generates UUID token, stores on conversation
- `joinByInviteLinkService` — finds conversation by `inviteToken`, adds member

---

### `upload.service.js`

**`getPresignedUploadUrl({ mimetype, size, userId })`**
1. Guards: S3 credentials must be set (returns 503 with helpful message otherwise)
2. Validates MIME type against allowlist (`MIME_TO_MESSAGE_TYPE` map)
3. Validates file size against per-type limits
4. Builds S3 key: `uploads/<type>/<userId>/<random16bytes>.<ext>`
5. Creates `PutObjectCommand` with `Tagging: "status=pending"` (lifecycle rules can clean up abandoned files)
6. Calls `getSignedUrl()` — returns a URL that expires in 10 minutes
7. Returns `{ uploadUrl, key, mediaType, mediaUrl, expiresIn }`

**`confirmUploadService(key)`**
1. Sends `HeadObjectCommand` to S3 — only fetches metadata, no body download
2. If `NotFound` (404): throws `ApiError(404, ...)`
3. Returns `{ exists: true, contentType }`

**`deleteMediaObject(key)`**
Silently catches errors — stale objects are cleaned by S3 lifecycle rules.

---

## Socket Layer: `chat.socket.js`

This file is called once per socket connection. Every registered handler has access to `io` (the server) and `socket` (this connection). `userId` is extracted from `socket.user._id`.

### On Connection
1. `updatePresence(true)` — updates `user.isOnline: true` in DB, then emits `user_status_update` to all contacts
2. `socket.join(userId.toString())` — every socket joins its personal room (for targeted notifications)

### `join_room`
1. Verifies user is a participant in the conversation (security check — prevents joining arbitrary rooms)
2. `socket.join(roomId)` — joins Socket.IO room
3. Calls `bulkMarkDeliveredService` — marks all undelivered messages in this conversation as delivered for this user
4. Emits `message_delivered` for each newly-delivered message

### `send_message`
1. Validates payload: roomId + (content or mediaKey) both required
2. Re-verifies participant membership (double-check)
3. Checks `onlyAdminsCanMessage` for group chats
4. Saves message to DB via `sendMessageService`
5. `io.to(roomId).emit("receive_message", message)` — sent to everyone in the room including sender (so sender's optimistic message gets replaced with the DB-confirmed version)
6. For each other participant: `io.to(participantId).emit("new_message_notification", ...)` — delivered to their personal room (even if they're not in this chat's room)
7. For the sender: emits `message_status_update` immediately confirming "sent"

### `typing` / `stop_typing`
`socket.to(roomId)` — sends to everyone in room EXCEPT the sender.

### `react_to_message`
Updates DB, then broadcasts updated `reactions` array to room.

### `edit_message`
Updates DB content, broadcasts `message_edited` to room.

### `delete_message`
- Everyone scope: `io.to(roomId).emit("message_deleted", ...)` — all clients hide the message
- Me scope: `socket.emit("message_deleted", ...)` — only this socket

### `disconnect`
Calls `updatePresence(false)` — marks user offline, notifies contacts.

### `subscribe_statuses` / `unsubscribe_statuses`
Joins/leaves the `statuses:<userId>` room for receiving status update events.

---

## Route → Controller → Service Flow

### Auth Routes (`/api/v1/auth`)

```
POST /register       → validate(registerSchema) → registerUser() → registerUserService()
POST /login          → validate(loginSchema)    → loginUser()    → loginUserService()
POST /logout         → protect()               → logoutUser()   → logoutService()
POST /refresh        → refreshToken()          → refreshTokenService()
GET  /verify/:token  → verifyEmail()           → verifyEmailService()
```

### Chat Routes (`/api/v1/chats`)

```
POST /                              → protect → validate → accessChat    → accessChatService
GET  /                              → protect           → fetchChats    → fetchChatsService
POST /group                         → protect → validate → createGroup   → createGroupChatService
PUT  /group/:chatId/add             → protect → validate → addMember     → addMemberService
PUT  /group/:chatId/remove          → protect → validate → removeMember  → removeMemberService
PUT  /group/:chatId/rename          → protect → validate → renameGroup   → renameGroupService
DELETE /group/:chatId/leave         → protect           → leaveGroup    → leaveGroupService
PATCH /group/:chatId                → protect → validate → updateGroupInfo
PUT  /group/:chatId/promote         → protect → validate → promoteAdmin
PUT  /group/:chatId/demote          → protect → validate → demoteAdmin
PATCH /group/:chatId/settings       → protect → validate → updateGroupSettings
GET  /group/:chatId/invite          → protect           → generateInviteLink
DELETE /group/:chatId/invite        → protect           → revokeInviteLink
POST /group/join/:token             → protect           → joinByInviteLink
PATCH /:chatId/settings             → protect → validate → updateConversationSettings
```

### Message Routes (`/api/v1/messages`)

```
GET  /:chatId             → protect → validate → allMessages → getAllMessagesService
POST /                    → protect → validate → sendMessage → sendMessageService
POST /:messageId/react    → protect → validate → reactToMessage
PATCH /:messageId/edit    → protect → validate → editMessage
DELETE /:messageId        → protect → validate → deleteMessage
GET  /starred             → protect → validate → getStarredMessages
POST /:messageId/star     → protect → validate → starMessage
DELETE /:messageId/star   → protect → validate → unstarMessage
PATCH /:chatId/disappear  → protect → validate → setDisappearTimer
```

### Upload Routes (`/api/v1/uploads`)

```
POST /presign   → protect → validate(presignSchema)        → requestPresignedUrl → getPresignedUploadUrl
POST /confirm   → protect → validate(confirmUploadSchema)  → confirmUpload       → confirmUploadService
```

---

## Validation: Zod Schemas

Zod schemas are in `/validators/`. Each file exports named schemas used by `validate()` middleware.

**Pattern:**
```js
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    username: z.string().optional(),
    password: z.string().min(6),
  }).refine(d => d.email || d.username, "Email or username required"),
});
```

The outer object always has `body`, `params`, and/or `query` keys matching what `validate()` passes. This keeps validation co-located with routes and decoupled from controllers.

---

## `socketEmitter.js` — The Singleton Pattern

Services like `message.service.js` need to emit socket events (e.g., push notification triggers) but importing `io` directly would create circular dependencies.

Solution: a module-level singleton.
```js
let _io = null;
export const initSocketEmitter = (io) => { _io = io; };
export const getIO = () => _io;
```

`server.js` calls `initSocketEmitter(io)` after creating the Socket.IO server. Then any service can call `getIO()` to emit events without having `io` in its import chain.

---

## Error Handling Philosophy

1. **Services throw `ApiError`** — with specific status codes (400, 401, 403, 404, etc.)
2. **Controllers use `asyncHandler`** — which catches any thrown error and forwards to `next(err)`
3. **`error.middleware.js`** — the global handler catches everything, wraps non-ApiError objects, and returns a uniform JSON structure
4. **Socket handlers** use try/catch inline and emit `socket.emit("error", { message })` to the client

```
Service throws ApiError(403, "Not authorized")
    → asyncHandler catches it
    → next(new ApiError(403, ...))
    → error.middleware sends { statusCode: 403, success: false, message: "...", data: null }
```
