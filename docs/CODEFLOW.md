# Vami — Complete Code Flow Documentation

> Every module. Every function call. Every decision branch. From network packet to database write and back.

---

## Table of Contents

1. [Server Bootstrap](#1-server-bootstrap)
2. [Inbound HTTP Request — Universal Middleware Chain](#2-inbound-http-request--universal-middleware-chain)
3. [Auth Module — Register](#3-auth-module--register)
4. [Auth Module — Email Verification](#4-auth-module--email-verification)
5. [Auth Module — Login](#5-auth-module--login)
6. [Auth Module — Refresh Token](#6-auth-module--refresh-token)
7. [Auth Module — Logout](#7-auth-module--logout)
8. [Rate Limiter Flow](#8-rate-limiter-flow)
9. [Protected Route — Bearer Token Verification](#9-protected-route--bearer-token-verification)
10. [WebSocket Connection — Socket Authentication](#10-websocket-connection--socket-authentication)
11. [Socket — join_room + Bulk Delivered](#11-socket--join_room--bulk-delivered)
12. [Socket — send_message (Text)](#12-socket--send_message-text)
13. [Socket — send_message (Media)](#13-socket--send_message-media)
14. [Socket — Message Status Lifecycle](#14-socket--message-status-lifecycle)
15. [Socket — React to Message](#15-socket--react-to-message)
16. [Socket — Edit Message](#16-socket--edit-message)
17. [Socket — Delete Message](#17-socket--delete-message)
18. [Socket — Presence (Online/Offline)](#18-socket--presence-onlineoffline)
19. [Socket — Typing Indicator](#19-socket--typing-indicator)
20. [Chat Module — Access / Create 1-on-1 Chat](#20-chat-module--access--create-1-on-1-chat)
21. [Chat Module — Fetch All Conversations](#21-chat-module--fetch-all-conversations)
22. [Group Chat — Create](#22-group-chat--create)
23. [Group Chat — Add Member](#23-group-chat--add-member)
24. [Group Chat — Remove Member](#24-group-chat--remove-member)
25. [Group Chat — Promote / Demote Admin](#25-group-chat--promote--demote-admin)
26. [Group Chat — Leave Group](#26-group-chat--leave-group)
27. [Group Chat — Invite Link Flow](#27-group-chat--invite-link-flow)
28. [Group Chat — Admin-Only Messaging Restriction](#28-group-chat--admin-only-messaging-restriction)
29. [Message Module — Get Messages (REST)](#29-message-module--get-messages-rest)
30. [Message Module — Star / Unstar](#30-message-module--star--unstar)
31. [Message Module — Disappearing Messages](#31-message-module--disappearing-messages)
32. [Media Upload Module — Presign → PUT → Confirm](#32-media-upload-module--presign--put--confirm)
33. [BullMQ Media Processing Queue](#33-bullmq-media-processing-queue)
34. [Status / Stories Module](#34-status--stories-module)
35. [Push Notifications Module](#35-push-notifications-module)
36. [User Module — Search, Profile, Block](#36-user-module--search-profile-block)
37. [Error Handling Pipeline](#37-error-handling-pipeline)
38. [Frontend — App Boot Sequence](#38-frontend--app-boot-sequence)
39. [Frontend — Route Guard: auth Middleware](#39-frontend--route-guard-auth-middleware)
40. [Frontend — Route Guard: guest Middleware](#40-frontend--route-guard-guest-middleware)
41. [Frontend — Login Page Flow](#41-frontend--login-page-flow)
42. [Frontend — Register Page Flow](#42-frontend--register-page-flow)
43. [Frontend — useApiFetch — 401 Interceptor](#43-frontend--useapifetch--401-interceptor)
44. [Frontend — Socket Initialization](#44-frontend--socket-initialization)
45. [Frontend — Sending a Text Message](#45-frontend--sending-a-text-message)
46. [Frontend — Sending a Media Message](#46-frontend--sending-a-media-message)
47. [Frontend — Receiving a Message](#47-frontend--receiving-a-message)
48. [Frontend — Timeline Pipeline](#48-frontend--timeline-pipeline)
49. [Frontend — MessageContent Render Decision Tree](#49-frontend--messagecontent-render-decision-tree)
50. [Frontend — Auth Store State Machine](#50-frontend--auth-store-state-machine)
51. [Redis Key Namespace Map](#51-redis-key-namespace-map)
52. [MongoDB Write Chain — Every Document Touched per Send Message](#52-mongodb-write-chain--every-document-touched-per-send-message)

---

## 1. Server Bootstrap

```
node server.js
│
├─ dotenv/config                     ← Load .env into process.env
│
├─ import app from "./src/app.js"    ← Express app (see §2)
│
├─ connectRedis()
│   ├─ pubClient = createClient(REDIS_URL)
│   ├─ subClient = pubClient.duplicate()
│   ├─ await pubClient.connect()
│   ├─ await subClient.connect()
│   └─ returns { pubClient, subClient }
│
├─ new Server(httpServer, { cors, adapter: createAdapter(pub, sub) })
│   └─ Redis adapter enables multi-process Socket.IO pub/sub
│
├─ initSocketEmitter(io)             ← Stores io in module-level _io ref
│                                      (decouples services from socket import)
│
├─ io.use(socketAuth)                ← JWT gate on every handshake (see §10)
│
├─ io.on("connection", socket => {
│   ├─ chatSocket(io, socket)        ← Registers all socket event handlers
│   └─ socket.on("disconnect", ...) ← Presence cleanup
│  })
│
├─ connectDB()                       ← mongoose.connect(MONGODB_URI, {replicaSet:"rs0"})
│   └─ replicaSet required for change streams + transactions
│
└─ server.listen(PORT)               ← HTTP server opens (Socket.IO piggybacks on it)
```

---

## 2. Inbound HTTP Request — Universal Middleware Chain

Every single HTTP request to the backend passes through this chain in order:

```
Browser / Client
       │
       │  HTTP Request
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  nginx (docker-compose)                                         │
│  Reverse proxy — routes /api → backend:5000, / → nuxt:3000     │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  Express Middleware Stack (app.js — executes in this order)  │
│                                                              │
│  1. cors({ origin: CLIENT_URL, credentials: true })         │
│     └─ Adds Access-Control-Allow-Origin header               │
│     └─ Allows cookies (credentials: true)                    │
│                                                              │
│  2. express.json()                                           │
│     └─ Parses application/json body → req.body               │
│                                                              │
│  3. helmet()                                                 │
│     └─ Sets 14 security headers (CSP, HSTS, X-Frame, etc.)  │
│                                                              │
│  4. cookieParser()                                           │
│     └─ Parses Cookie header → req.cookies                    │
│                                                              │
│  5. express.urlencoded({ extended: true })                   │
│     └─ Parses form-encoded bodies                            │
│                                                              │
│  6. apiLimiter (lazy singleton)                              │
│     └─ 10,000 req / 1 min per IP — window stored in Redis   │
│     └─ Key prefix: "rl:api:"                                 │
│     └─ 429 + { success: false, message: "..." } if exceeded │
│                                                              │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Router match                   │
│  /api/v1/auth/*    → authRoutes │
│  /api/v1/users/*   → userRoutes │
│  /api/v1/chats/*   → chatRoutes │
│  /api/v1/messages/*→ msgRoutes  │
│  /api/v1/uploads/* → uploadRts  │
│  /api/v1/statuses/*→ statusRts  │
│  /api/v1/push/*    → pushRoutes │
│  /health           → inline     │
└─────────────────────────────────┘
       │
       ▼
  Route-level middleware (varies) → Controller → Service → Repository → DB
       │
       ▼
  [Error thrown anywhere] → next(err) → errorHandler (last middleware)
```

---

## 3. Auth Module — Register

```
POST /api/v1/auth/register
  { username, email, password }
       │
       ▼
[1] authLimiter
    └─ 50 req / 15 min per IP (Redis key: "rl:auth:<ip>")
    └─ 429 if exceeded → STOP

[2] validate(registerSchema)
    └─ Zod: username min 3, max 30 / email format / password min 8
    └─ 400 + field errors if invalid → STOP
    └─ Sets req.validatedData

[3] registerUser (controller)
    └─ asyncHandler wraps Promise.catch → next(err)
    └─ calls registerUserService(req.body)

[4] registerUserService(service)
    │
    ├─ Guard: all fields present — 400 if missing
    │
    ├─ findUserByEmailOrUsername({ username, email })
    │   └─ User.findOne({ $or: [{ email }, { username }] })
    │   └─ 409 "already exists" if found → STOP
    │
    ├─ createUser({ username.toLowerCase(), email, password })
    │   └─ new User({ ... }).save()
    │   └─ User.pre("save") hook fires:
    │       ├─ isModified("password")? YES
    │       ├─ bcrypt.genSalt(10)
    │       └─ password = bcrypt.hash(plaintext, salt)
    │   └─ Returns saved user document
    │
    ├─ Email verification (FIRE AND FORGET — never blocks registration):
    │   ├─ crypto.randomBytes(32).toString("hex") → evToken
    │   ├─ setEmailVerificationToken(evToken, user._id)
    │   │   └─ Redis: SET "ev:<evToken>" "<userId>" EX 86400  (24h)
    │   └─ sendVerificationEmail({ to, username, token }).catch(log)
    │       └─ see §4 for email flow
    │
    ├─ generateTokenPair(user._id)
    │   ├─ jti = crypto.randomUUID()
    │   ├─ accessToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "15m" })
    │   └─ refreshToken = jwt.sign({ id: userId, type:"refresh", jti }, JWT_SECRET, { expiresIn: "7d" })
    │
    └─ returns { user, accessToken, refreshToken, jti }

[5] registerUser (controller) — back from service
    ├─ res.cookie("refreshToken", refreshToken, {
    │     httpOnly: true,          ← JS cannot read this cookie
    │     secure: prod only,
    │     sameSite: "strict",
    │     maxAge: 7d,
    │     path: "/api/v1/auth"    ← cookie only sent to auth routes
    │   })
    └─ sendResponse(res, 201, "User registered successfully", { user, token: accessToken })
        └─ { statusCode:201, success:true, message:"...", data:{ user, token } }

RESPONSE 201:
{
  "statusCode": 201,
  "success": true,
  "message": "User registered successfully",
  "data": { "user": {...}, "token": "<15m JWT>" }
}
Cookie: refreshToken=<7d JWT>; HttpOnly; Path=/api/v1/auth
```

---

## 4. Auth Module — Email Verification

```
sendVerificationEmail({ to, username, token })
       │
       ▼
getTransporter()
    ├─ _transporter already exists? → return cached instance
    ├─ NODE_ENV=development AND no SMTP_HOST?
    │   ├─ nodemailer.createTestAccount() → Ethereal credentials
    │   ├─ createTransport({ host:"smtp.ethereal.email", port:587, auth:... })
    │   └─ console.log("📧 Preview URL: ...")
    └─ Production:
        └─ createTransport({ SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS })

transporter.sendMail({
  from: SMTP_FROM,
  to: user.email,
  subject: "Verify your Vami account",
  html: <HTML with link: CLIENT_URL/verify-email?token=<evToken>>
})

──────────────────────────────────────────────────────────────
User clicks link in email: GET /api/v1/auth/verify-email?token=<evToken>
──────────────────────────────────────────────────────────────

[1] verifyEmail (controller) → verifyEmailService(token)

[2] verifyEmailService(token)
    │
    ├─ Guard: token present — 400 if missing
    │
    ├─ getEmailVerificationToken(token)
    │   └─ Redis: GET "ev:<token>"  → userId string or null
    │   └─ null → 400 "Invalid or expired verification token" → STOP
    │
    ├─ verifyUserEmail(userId)
    │   └─ User.findByIdAndUpdate(userId, { $set:{ emailVerified: true } }, { new:true })
    │   └─ null → 404 "User not found"
    │
    ├─ deleteEmailVerificationToken(token)
    │   └─ Redis: DEL "ev:<token>"   ← prevents reuse
    │
    └─ returns updated user

RESPONSE 200: { data: { user: { emailVerified: true, ... } } }

──────────────────────────────────────────────────────────────
POST /api/v1/auth/resend-verification  (requires Bearer token)
──────────────────────────────────────────────────────────────

[1] protect middleware (see §9)
[2] resendVerificationService(req.user._id)
    ├─ findUserById → 404 if not found
    ├─ user.emailVerified? → 400 "already verified"
    ├─ evToken = crypto.randomBytes(32).toString("hex")
    ├─ setEmailVerificationToken(evToken, userId)  ← replaces old token
    └─ sendVerificationEmail(...)  fire-and-forget
```

---

## 5. Auth Module — Login

```
POST /api/v1/auth/login
  { email?, username?, password }
       │
       ▼
[1] authLimiter — 50 / 15 min per IP

[2] validate(loginSchema)
    └─ Zod: (email OR username) + password min 8
    └─ 400 if invalid

[3] loginUser (controller) → loginUserService(req.body)

[4] loginUserService
    │
    ├─ Guard: username OR email present — 400 if both absent
    │
    ├─ findUserByEmailOrUsername({ email, username }, "+password")
    │   └─ User.findOne({ $or:[{email},{username}] }).select("+password")
    │      ↑ password field is select:false by default — explicitly included here
    │   └─ null → 404 "User does not exist"
    │
    ├─ user.isPasswordCorrect(password)
    │   └─ bcrypt.compare(plaintext, user.password)  → boolean
    │   └─ false → 401 "Invalid credentials"
    │
    ├─ safeUser = user.toObject(); delete safeUser.password
    │   └─ Never return the password hash to the client
    │
    ├─ generateTokenPair(user._id)  ← same as register
    │
    └─ returns { user: safeUser, accessToken, refreshToken }

[5] Set HttpOnly refreshToken cookie + respond 200
    {
      "data": { "user": {...}, "token": "<15m JWT>" }
    }
```

---

## 6. Auth Module — Refresh Token

```
POST /api/v1/auth/refresh
  (no body — relies on refreshToken cookie being sent automatically)
       │
       ▼
[1] No rate limiter on this route (intentional — clients must be able to refresh)
[2] No validator on this route

[3] refreshToken (controller) → refreshTokenService(req.cookies?.refreshToken)

[4] refreshTokenService(rawRefreshToken)
    │
    ├─ Guard: no token → 401
    │
    ├─ verifyJWTToken(rawRefreshToken)
    │   └─ jwt.verify(token, JWT_SECRET)
    │   └─ Throws or returns null if expired/tampered → 401 "Invalid refresh token"
    │
    ├─ Guard: decoded.type !== "refresh" OR !decoded.jti → 401
    │   └─ Ensures this is actually a refresh token, not an access token being misused
    │
    ├─ isRefreshTokenBlacklisted(decoded.jti)
    │   └─ Redis: GET "rt:bl:<jti>"
    │   └─ exists → 401 "Refresh token has been revoked" → STOP
    │      ↑ Prevents reuse of stolen/old refresh tokens
    │
    ├─ findUserById(decoded.id) → 401 if user deleted
    │
    ├─ Blacklist the CONSUMED token immediately (one-time use enforcement)
    │   └─ remainingTtl = decoded.exp - now()
    │   └─ Redis: SET "rt:bl:<jti>" "1" EX <remainingTtl>
    │
    ├─ generateTokenPair(user._id)  ← issues NEW access + refresh tokens
    │   └─ NEW jti for the new refresh token
    │
    └─ returns { user, accessToken, refreshToken: newRefreshToken }

[5] Set new refreshToken cookie (rotated) + respond 200
    {
      "data": { "user": {...}, "token": "<new 15m JWT>" }
    }
Cookie: refreshToken=<new 7d JWT>; HttpOnly; Path=/api/v1/auth

REPLAY ATTACK PROTECTION:
  Old refresh token JTI → blacklisted in Redis for its remaining lifetime
  Attacker cannot reuse captured refresh token even if obtained before rotation
```

---

## 7. Auth Module — Logout

```
POST /api/v1/auth/logout
  (no body — relies on refreshToken cookie)
       │
       ▼
[1] logoutUser (controller) → logoutService(req.cookies?.refreshToken)

[2] logoutService(rawRefreshToken)
    ├─ No token? → return silently (already logged out)
    ├─ verifyJWTToken(rawRefreshToken) → decoded
    ├─ No jti? → return silently
    ├─ remainingTtl = decoded.exp - now()
    └─ Redis: SET "rt:bl:<jti>" "1" EX <remainingTtl>
        └─ Token is now immediately unusable for refresh

[3] res.clearCookie("refreshToken", { same options as set })
    └─ Browser deletes the cookie

[4] sendResponse(res, 200, "Logged out successfully")

SECURITY NOTE:
  The access token (15m JWT) is NOT invalidated — it lives in memory only (no server
  state), expires naturally in ≤ 15 minutes. This is the standard stateless JWT tradeoff.
  For stricter security, maintain an access-token blacklist in Redis as well.
```

---

## 8. Rate Limiter Flow

```
Request arrives at Express
       │
       ▼
apiLimiter (wraps all routes) or authLimiter (wraps /auth/register, /auth/login)
       │
       ▼
makeLimiter(windowMs, max, message, prefix)(req, res, next)
    │
    ├─ instance already exists?
    │   YES → call instance(req, res, next) directly
    │
    └─ NO → (first request only)
        ├─ new RedisStore({ sendCommand: pubClient.sendCommand, prefix })
        │   └─ Registers a Lua script in Redis for atomic increment-and-expire
        ├─ rateLimit({ windowMs, max, standardHeaders:true, validate:{creationStack:false}, store })
        └─ instance = the resulting middleware; call it

Inside rateLimit middleware:
    │
    ├─ identifier = IP address (default)
    ├─ Redis: INCR "rl:<prefix><ip>"
    │         EXPIRE if new key
    │
    ├─ count > max?
    │   YES → 429  { success:false, message: "Too many requests..." }
    │         Retry-After header set
    │
    └─ NO  → next()

Window sizes:
  apiLimiter:  10,000 req / 1 minute  (prefix "rl:api:")
  authLimiter:    50  req / 15 minutes (prefix "rl:auth:")
```

---

## 9. Protected Route — Bearer Token Verification

```
Every protected route uses router.use(protect) or protect directly

Request arrives (must have "Authorization: Bearer <accessToken>" header)
       │
       ▼
protect(req, res, next)
    │
    ├─ authHeader = req.headers.authorization
    ├─ !authHeader OR !authHeader.startsWith("Bearer")
    │   └─ next(ApiError(401, "Not authorized, no token")) → STOP
    │
    ├─ token = authHeader.split(" ")[1]
    ├─ decoded = verifyJWTToken(token)
    │   └─ jwt.verify(token, JWT_SECRET) → null if expired or tampered
    ├─ !decoded → next(ApiError(401, "Not authorized, invalid token")) → STOP
    │
    ├─ user = findUserById(decoded.id)
    │   └─ User.findById(id).select("-password")
    ├─ !user → next(ApiError(401, "Not authorized, user no longer exists")) → STOP
    │
    ├─ req.user = user   ← all downstream handlers can access req.user
    └─ next()

NOTE: The access token is NOT checked against any blacklist.
      Only refresh tokens are blacklisted. Access tokens expire in 15 minutes.
```

---

## 10. WebSocket Connection — Socket Authentication

```
Client: socket.io-client connects to ws://backend:5000
  auth: { token: "<accessToken>" }
  transports: ["websocket"]
       │
       ▼
Socket.IO handshake
       │
       ▼
io.use(socketAuth)  ← runs BEFORE "connection" event fires
    │
    ├─ token = socket.handshake.auth?.token
    ├─ !token → next(Error("No token provided")) → connection refused
    │
    ├─ decoded = verifyJWTToken(token)
    ├─ !decoded → next(Error("Invalid token")) → connection refused
    │
    ├─ cacheKey = "user:<decoded.id>"
    ├─ user = await cacheGet(cacheKey)
    │   └─ Redis: GET "user:<id>" → parse JSON or null
    │
    ├─ user is null? (cache miss)
    │   ├─ user = findUserById(decoded.id)
    │   ├─ !user → next(Error("User not found")) → connection refused
    │   └─ cacheSet(cacheKey, user, 300)  ← cache for 5 minutes
    │       └─ Redis: SET "user:<id>" <json> EX 300
    │
    ├─ socket.user = user   ← available in all subsequent event handlers
    └─ next()               ← connection accepted

io.on("connection", socket => {
    chatSocket(io, socket)
    socket.on("disconnect", () => updatePresence(false))
})
```

---

## 11. Socket — join_room + Bulk Delivered

```
Client emits: socket.emit("join_room", chatId)
       │
       ▼
socket.on("join_room", async (roomId) => {
    │
    ├─ !roomId → return (silent ignore)
    │
    ├─ isParticipant(userId, roomId)
    │   └─ Conversation.findOne({ _id: roomId, participants: userId })
    ├─ not found → socket.emit("error", "Unauthorized") → STOP
    │
    ├─ socket.join(roomId)  ← socket now receives io.to(roomId).emit(...)
    │
    └─ bulkMarkDeliveredService({ conversationId: roomId, userId })
        ├─ bulkMarkDelivered(conversationId, userId) [repository]
        │   └─ Message.updateMany(
        │         { chatId, sender: {$ne: userId}, "deliveries.userId": {$ne: userId} },
        │         { $push: { deliveries: { userId, status:"delivered" } } }
        │       )
        │   └─ returns array of affected messageIds
        │
        ├─ for each deliveredId:
        │   └─ io.to(roomId).emit("message_delivered", { messageId, userId })
        │       └─ Sender's UI updates tick icons from 1-tick to 2-tick (gray)
        │
        └─ (errors logged, never thrown to socket)
```

---

## 12. Socket — send_message (Text)

```
Client emits: socket.emit("send_message", {
  roomId, content: "Hello", type: "text", replyToId?: "..."
})
       │
       ▼
socket.on("send_message", async (data) => {
    │
    ├─ Guard: !roomId OR (!content AND !mediaKey) → socket.emit("error") → STOP
    │
    ├─ isParticipant(userId, roomId) → 403 if not member
    │
    ├─ conversation.isGroupChat AND onlyAdminsCanMessage?
    │   └─ isAdmin check (groupAdmin OR admins array)
    │   └─ not admin → socket.emit("error", "Only admins can send") → STOP
    │
    └─ sendMessageService({ senderId:userId, chatId:roomId, content, type, replyToId })

sendMessageService
    │
    ├─ Validation: !chatId → 400 / !content AND !mediaKey → 400
    │
    ├─ insertMessage({ senderId, chatId, content, type, replyToId, ...media })
    │   └─ new Message({ sender, chatId, content, type, replyToId }).save()
    │   └─ If replyToId: populated replyTo embedded in returned doc
    │
    ├─ mediaKey present AND type !== "text"?
    │   └─ import("./queues/media.queue.js")  ← dynamic to avoid circular dep
    │       └─ enqueueMediaProcessing({ messageId, mediaKey, mediaType, mimetype })
    │           └─ BullMQ.add("media-processing", { ... })  ← see §33
    │
    ├─ Promise.all([
    │     updateConversationLatestMessage(chatId, message._id),
    │     └─ Conversation.findByIdAndUpdate(chatId, { latestMessage: messageId })
    │     incrementUnreadForOthers(chatId, senderId)
    │     └─ ConversationParticipant.updateMany(
    │           { conversation: chatId, user: {$ne: senderId} },
    │           { $inc: { unreadCount: 1 } }
    │         )
    │   ])
    │
    ├─ Push notification dispatch (FIRE AND FORGET)
    │   └─ dynamic import Conversation → find offline participants
    │       └─ sendPushToUsers(offlineIds, { title, body, url })  ← see §35
    │
    └─ returns fully-populated message document

Back in socket handler:
    ├─ io.to(roomId).emit("receive_message", message)
    │   └─ EVERY socket in the room receives this
    │       └─ Includes sender → replaces optimistic message on sender's UI
    │
    └─ for each participant (excluding sender):
        └─ io.to(participantId).emit("new_message_notification", {
               chatId: roomId, message: message.content, sender: userId
           })
           └─ User's personal room (userId) receives this
               └─ Non-active conversations: sidebar unread count incremented
```

---

## 13. Socket — send_message (Media)

```
PREREQUISITE: Client has already completed presign → PUT → confirm (see §32)
              and now has: mediaKey, mediaUrl, mediaMimeType, mediaSize

Client emits: socket.emit("send_message", {
  roomId,
  type: "image",          ← "image" | "video" | "audio" | "voice" | "document"
  mediaKey: "uploads/image/userId/abc.jpg",
  mediaUrl: "http://minio:9000/vami-media/uploads/image/userId/abc.jpg",
  mediaMimeType: "image/jpeg",
  mediaSize: 36552,
  mediaDuration?: 30       ← for audio/video only
})
       │
       ▼
[Same authorization checks as text message]
       │
       ▼
sendMessageService({ ..., type, mediaKey, mediaUrl, mediaMimeType, mediaSize, mediaDuration })
    │
    ├─ insertMessage saves:
    │   Message {
    │     type: "image",
    │     content: null,      ← media messages have no text content
    │     mediaKey: "uploads/image/userId/abc.jpg",
    │     mediaUrl: "http://...",
    │     mediaMimeType: "image/jpeg",
    │     mediaSize: 36552
    │   }
    │
    ├─ mediaKey present AND type !== "text"?
    │   └─ enqueueMediaProcessing({ messageId, mediaKey, mediaType:"image", mimetype:"image/jpeg" })
    │       └─ BullMQ worker generates thumbnail asynchronously
    │           └─ On completion: patches message.thumbnailUrl in DB
    │
    └─ [rest identical to text: updateLatestMessage, incrementUnread, push notify, emit]

io.to(roomId).emit("receive_message", message)   ← message.type === "image"
    └─ MessageContent.vue receives message with type: "image"
        └─ Renders <img :src="message.mediaUrl">
```

---

## 14. Socket — Message Status Lifecycle

```
STATUS STATES: sending → sent → delivered → read

[sent] — emitted immediately after message is persisted
    Backend socket after send_message:
    io.to(senderId).emit("message_status_update", { messageId, status: "sent" })
    Frontend: ChatBody tick: ✓ (single gray)

[delivered] — emitted when recipient opens the conversation
    See §11: join_room triggers bulkMarkDeliveredService
    io.to(roomId).emit("message_delivered", { messageId, userId })
    Frontend: ChatBody tick: ✓✓ (double gray)

[read] — emitted when recipient explicitly marks as read
    Client emits: socket.emit("message_read", { messageId, roomId })
    │
    ▼
    socket.on("message_read", async ({ messageId, roomId }) => {
        markReadService({ messageId, userId })
            ├─ upsertReceipt(messageId, userId, "read")
            │   └─ Message.updateOne: push { userId, status:"read" } to deliveries
            └─ aggregateMessageStatus(messageId)
                ├─ count deliveries with status:"read"
                ├─ all recipients read? → "read"
                ├─ all recipients at least delivered? → "delivered"
                └─ else → "sent"

        io.to(senderId).emit("message_status_update", {
            messageId, status: aggregateStatus, readBy: userId
        })
        io.to(roomId).emit("message_status_update", {
            messageId, status: aggregateStatus
        })
    })
    Frontend: ChatBody tick: ✓✓ (double blue when status === "read")
```

---

## 15. Socket — React to Message

```
Client emits: socket.emit("react_to_message", {
  messageId: "...", roomId: "...", emoji: "👍"  ← empty string = remove reaction
})
       │
       ▼
socket.on("react_to_message", async ({ messageId, roomId, emoji }) => {
    │
    ├─ Guard: !messageId OR !roomId → return
    │
    └─ reactToMessageService({ messageId, userId, emoji, chatId: roomId })
        │
        ├─ findMessageById(messageId) → assertParticipant(chatId, userId)
        │
        ├─ emoji empty?
        │   └─ Message.updateOne(messageId, { $pull: { reactions: { user: userId } } })
        ├─ emoji present?
        │   └─ upsertReaction(messageId, userId, emoji)
        │       └─ atomic: remove old reaction from this user + push new
        │           └─ Message.findByIdAndUpdate(id, { $pull:{reactions:{user:userId}} })
        │               then Message.findByIdAndUpdate(id, { $push:{reactions:{user,emoji}} })
        │
        └─ returns updated message

    io.to(roomId).emit("message_reaction_updated", {
        messageId, reactions: message.reactions
    })
    └─ Every client in the room patches their message's reactions array
})
```

---

## 16. Socket — Edit Message

```
Client emits: socket.emit("edit_message", {
  messageId: "...", roomId: "...", content: "corrected text"
})
       │
       ▼
socket.on("edit_message", async ({ messageId, roomId, content }) => {
    │
    ├─ Guard: missing fields → return
    │
    └─ editMessageService({ messageId, userId, newContent: content })
        │
        ├─ findMessageById(messageId, populated)
        ├─ assertMessageOwner (message.sender._id === userId) → 403 if not
        ├─ assertNotDeleted (message.isDeleted) → 400 if deleted
        ├─ assertEditWindow (Date.now() - message.createdAt > 15min) → 400 if expired
        │   └─ EDIT_WINDOW_MS = 15 * 60 * 1000 ms
        │
        └─ editMessageContent(messageId, newContent)
            └─ Message.findByIdAndUpdate(id, {
                 $set: { content: newContent, isEdited: true, editedAt: new Date() }
               })

    io.to(roomId).emit("message_edited", {
        messageId, content: message.content, isEdited: true, editedAt: message.editedAt
    })
})
Frontend: _patchMessage(messageId, m => ({ ...m, content, isEdited, editedAt }))
```

---

## 17. Socket — Delete Message

```
Client emits: socket.emit("delete_message", {
  messageId: "...", roomId: "...", scope: "me" | "everyone"
})
       │
       ▼
socket.on("delete_message", async ({ messageId, roomId, scope }) => {
    │
    └─ deleteMessageService({ messageId, userId, scope: scope || "me" })
        │
        ├─ findMessageById(messageId)
        ├─ assertNotDeleted
        │
        ├─ scope === "everyone"?
        │   ├─ assertMessageOwner → 403 if not sender
        │   ├─ assertEditWindow (15 min) → 400 if too old
        │   └─ deleteMessageForEveryone(messageId)
        │       └─ Message.findByIdAndUpdate(id, {
        │            $set: { isDeleted: true, content: "This message was deleted",
        │                    mediaKey: null, mediaUrl: null }
        │          })
        │
        └─ scope === "me"?
            └─ deleteMessageForUser(messageId, userId)
                └─ Message.findByIdAndUpdate(id, {
                     $addToSet: { deletedFor: userId }
                   })
                   └─ findMessages filters out messages where deletedFor includes currentUserId

    result.scope === "everyone":
        io.to(roomId).emit("message_deleted", {
            messageId, scope:"everyone", content:"This message was deleted"
        })
        └─ All clients remove/grey-out the message

    result.scope === "me":
        socket.emit("message_deleted", { messageId, scope:"me" })
        └─ Only the sender's socket — other clients unaffected
```

---

## 18. Socket — Presence (Online/Offline)

```
Connection established → updatePresence(true)
       │
       ▼
updatePresence(isOnline: boolean)
    │
    ├─ updateUserPresenceService({ userId, isOnline })
    │   └─ User.findByIdAndUpdate(userId, {
    │        $set: { isOnline, lastSeen: isOnline ? undefined : new Date() }
    │      })
    │
    ├─ getContactIds(userId)
    │   └─ Conversation.find({ participants: userId }, { participants: 1 }).lean()
    │       → builds Set of all unique contact userIds across all conversations
    │   WHY: emit only to contacts, not globally (O(contacts) not O(all_sockets))
    │
    └─ for each contactId:
        io.to(contactId).emit("user_status_update", { userId, isOnline })
        └─ Contact's personal room receives this
            └─ chatStore adds/removes userId from onlineUsers Set
                └─ Avatar green dot appears/disappears

Disconnection → socket.on("disconnect") → updatePresence(false)
    └─ Same flow, isOnline: false, lastSeen: now
```

---

## 19. Socket — Typing Indicator

```
Client starts typing:
    socket.emit("typing", roomId)
       │
       ▼
    socket.to(roomId).emit("user_typing", { userId, roomId })
        └─ socket.to() = room EXCLUDING sender
        └─ Frontend: chatStore adds userId to typingUsers Set with 3s timeout

Client stops typing (explicit or composure blur):
    socket.emit("stop_typing", roomId)
       │
       ▼
    socket.to(roomId).emit("user_stopped_typing", { userId, roomId })
        └─ Frontend: chatStore removes userId from typingUsers Set

Frontend visual:
    typingUsers.size > 0
        → injectTypingIndicator (pipeline step 4) appends { _row:"typing" }
        → TypingIndicatorRow.vue renders animated 3-dot bounce
```

---

## 20. Chat Module — Access / Create 1-on-1 Chat

```
POST /api/v1/chats   { userId: "<targetUserId>" }
       │
       ▼
[1] protect → req.user = currentUser
[2] validate(accessChatSchema)
[3] accessChat (controller) → accessChatService({ userId, currentUserId })

accessChatService
    │
    ├─ Guard: userId present — 400 if not
    ├─ Guard: userId !== currentUserId — 400 "Cannot chat with yourself"
    │
    ├─ Block check (parallel):
    │   ├─ isBlockedByUser(currentUserId, userId)  → "You have blocked this user"
    │   └─ isBlockedByUser(userId, currentUserId)  → "You cannot message this user"
    │   └─ User.findOne({ _id: blocker, blockedUsers: { $in: [blockee] } })
    │
    ├─ findOneOnOneChat(currentUserId, userId)
    │   └─ Conversation.find({
    │        isGroupChat: false,
    │        participants: { $all: [currentUserId, userId], $size: 2 }
    │      }).populate(participants, latestMessage)
    │   └─ Found? → return existing chat (idempotent)
    │
    └─ Not found → createOneOnOneChat(currentUserId, userId)
        └─ new Conversation({
             participants: [currentUserId, userId],
             isGroupChat: false
           }).save()
        └─ Creates ConversationParticipant records for both users
        └─ returns populated conversation
```

---

## 21. Chat Module — Fetch All Conversations

```
GET /api/v1/chats
       │
       ▼
[1] protect
[2] fetchChats → fetchChatsService(req.user._id)

fetchChatsService
    │
    ├─ Parallel:
    │   ├─ findUserChats(currentUserId)
    │   │   └─ Conversation.find({ participants: userId })
    │   │       .populate("participants", "-password")
    │   │       .populate("latestMessage")
    │   │       .sort({ updatedAt: -1 })
    │   │
    │   └─ findUserParticipantRecords(currentUserId)
    │       └─ ConversationParticipant.find({ user: userId })
    │           → returns per-chat metadata: unreadCount, isPinned, isArchived, isMuted
    │
    ├─ Build metadataMap: Map<chatId, participantRecord>
    │
    └─ chats.map(chat => {
           const meta = metadataMap.get(chat._id.toString());
           chat.unreadCount = meta?.unreadCount || 0;
           chat.isPinned    = meta?.isPinned || false;
           chat.isArchived  = meta?.isArchived || false;
           chat.isMuted     = meta?.isMuted || false;
           return chat;
       })

RESPONSE 200: [{ _id, chatName, isGroupChat, participants[...], latestMessage, unreadCount, isPinned, ... }]
```

---

## 22. Group Chat — Create

```
POST /api/v1/chats/group
  { chatName: "Dev Team", participants: ["id1", "id2"] }
       │
       ▼
[1] protect
[2] validate(createGroupSchema)
    └─ Zod: chatName min 1, participants array min 2
[3] createGroupChat (controller) → createGroupChatService({ chatName, participants, adminId: req.user._id })

createGroupChatService
    │
    ├─ Guard: chatName present
    ├─ Guard: participants.length >= 2
    │
    ├─ allParticipants = [...new Set([adminId, ...participants])]
    │   └─ Deduplicates and ensures admin is always included
    │
    └─ createGroupChat({ chatName, participants: allParticipants, adminId })
        └─ new Conversation({
             chatName: chatName.trim(),
             isGroupChat: true,
             participants: allParticipants,
             groupAdmin: adminId,
             admins: [adminId]
           }).save()
        └─ Creates ConversationParticipant records for all participants
        └─ returns populated conversation

RESPONSE 200: { _id, chatName, isGroupChat:true, participants[...], groupAdmin, admins[...] }
```

---

## 23. Group Chat — Add Member

```
PUT /api/v1/chats/group/:chatId/add   { userId: "<newMemberId>" }
       │
       ▼
[1] protect, validate(groupMemberSchema)
[2] addMember → addMemberService({ chatId, userId, currentUserId })

addMemberService
    │
    ├─ findConversationById(chatId) → 404 if not found
    ├─ Guard: isGroupChat → 400 if not a group
    ├─ isGroupAdmin(conversation, currentUserId) → 403 if not admin
    │   └─ checks groupAdmin === userId OR admins.includes(userId)
    ├─ Guard: user already in participants → 400
    │
    └─ addMemberToGroup(chatId, userId)
        └─ Conversation.findByIdAndUpdate(chatId, { $push:{ participants: userId } })
        └─ Creates ConversationParticipant record for new user
        └─ returns updated conversation

NOTE: emitToRoom(chatId, "group_member_added", { user }) is called by the service
      via socketEmitter → all room members see the updated participants list
```

---

## 24. Group Chat — Remove Member

```
PUT /api/v1/chats/group/:chatId/remove   { userId: "<memberId>" }
       │
       ▼
removeMemberService
    │
    ├─ findConversationById → 404
    ├─ isGroupChat guard → 400
    ├─ isGroupAdmin(conversation, currentUserId) → 403
    ├─ Guard: userId !== adminId (cannot remove the owner) → 403
    ├─ Guard: userId in participants → 400 if not member
    │
    └─ removeMemberFromGroup(chatId, userId)
        └─ Conversation.findByIdAndUpdate(chatId, { $pull:{ participants: userId } })
        └─ Deletes ConversationParticipant record for removed user

emitToRoom(chatId, "group_member_left", { userId })
    └─ All clients remove user from participants list
```

---

## 25. Group Chat — Promote / Demote Admin

```
PUT /api/v1/chats/group/:chatId/promote   { userId: "<memberId>" }
       │
       ▼
promoteToAdmin → only groupAdmin (original creator) can promote
    ├─ conversation.groupAdmin.toString() === currentUserId.toString() → 403 if not
    ├─ userId already in admins array → 400
    └─ Conversation.findByIdAndUpdate(chatId, { $addToSet:{ admins: userId } })

emitToRoom(chatId, "group_admin_promoted", { userId })

──────────────────────────────────────────────────────────────

PUT /api/v1/chats/group/:chatId/demote   { userId: "<adminId>" }
       │
       ▼
demoteFromAdmin → only groupAdmin can demote
    ├─ conversation.groupAdmin.toString() === currentUserId.toString() → 403
    ├─ userId === groupAdmin → 400 "Cannot demote the group owner"
    └─ Conversation.findByIdAndUpdate(chatId, { $pull:{ admins: userId } })

emitToRoom(chatId, "group_admin_demoted", { userId })
```

---

## 26. Group Chat — Leave Group

```
DELETE /api/v1/chats/group/:chatId/leave
       │
       ▼
leaveGroup → leaveGroupConversation({ chatId, userId: req.user._id })
    │
    ├─ findConversationById → 404
    ├─ isGroupChat guard → 400
    ├─ userId in participants → 400 if not member
    │
    ├─ userId === conversation.groupAdmin?
    │   YES → is there another admin in admins array?
    │     YES → promote first other admin to groupAdmin
    │           promoteOldestParticipant(chatId, admins[0])
    │     NO  → is there any other participant?
    │       YES → promote oldest participant: groupAdmin = participants[1]
    │       NO  → delete the conversation (no members left)
    │
    └─ $pull user from participants + admins arrays
       Delete ConversationParticipant record

emitToRoom(chatId, "group_member_left", { userId })
    └─ All clients sync their participants list
```

---

## 27. Group Chat — Invite Link Flow

```
GET /api/v1/chats/group/:chatId/invite
       │
       ▼
generateInviteLink → generateInviteLinkService({ chatId, currentUserId })
    │
    ├─ isGroupAdmin guard → 403
    ├─ Already has non-expired inviteToken? → return existing link
    │
    ├─ token = crypto.randomBytes(32).toString("hex")
    └─ setInviteToken(chatId, token, expiresAt: 7 days)
        └─ Conversation.findByIdAndUpdate(chatId, {
             $set: { inviteToken: token, inviteTokenExpiry: Date.now() + 7d }
           })

RESPONSE: { inviteLink: "<CLIENT_URL>/join/<token>" }

──────────────────────────────────────────────────────────────
DELETE /api/v1/chats/group/:chatId/invite  → revokeInviteLink
    └─ Conversation.findByIdAndUpdate(chatId, {
         $unset: { inviteToken: 1, inviteTokenExpiry: 1 }
       })

──────────────────────────────────────────────────────────────
POST /api/v1/chats/group/join/:token
       │
       ▼
joinByInviteLink → joinByInviteLinkService({ token, userId })
    │
    ├─ findByInviteToken(token)
    │   └─ Conversation.findOne({ inviteToken: token, inviteTokenExpiry: {$gt: now} })
    ├─ null → 400 "Invalid or expired invite link"
    ├─ userId already in participants → 400 "Already a member"
    └─ addMemberToGroup(chatId, userId)
        └─ Same as regular add member flow
```

---

## 28. Group Chat — Admin-Only Messaging Restriction

```
PATCH /api/v1/chats/group/:chatId/settings
  { onlyAdminsCanMessage: true }
       │
       ▼
[1] protect, validate(updateGroupSettingsSchema)
[2] updateGroupSettings → updateGroupSettingsService({ chatId, currentUserId, settings })

    ├─ findConversationById → 404
    ├─ isGroupAdmin → 403
    └─ updateGroupSettings(chatId, settings)
        └─ Conversation.findByIdAndUpdate(chatId, { $set: settings })

emitToRoom(chatId, "group_updated", updatedConversation)
    └─ All clients update their local conversation.onlyAdminsCanMessage

──────────────────────────────────────────────────────────────
Now when a non-admin sends a message:

socket.on("send_message") checks:
    if (conversation.isGroupChat && conversation.onlyAdminsCanMessage) {
      const isAdmin = groupAdmin === uid || admins.includes(uid);
      if (!isAdmin) socket.emit("error", "Only admins can send messages")
    }
```

---

## 29. Message Module — Get Messages (REST)

```
GET /api/v1/messages/:chatId?page=1&limit=20
       │
       ▼
[1] protect
[2] validate(getMessagesSchema)
[3] allMessages → getAllMessagesService(chatId, query, req.user._id)

getAllMessagesService
    │
    ├─ Guard: chatId present
    ├─ assertParticipant(chatId, userId)
    │   └─ findParticipant → ConversationParticipant.findOne({ conversation: chatId, user: userId })
    │   └─ 403 if not participant
    │
    ├─ page  = Math.max(Number(query.page) || 1, 1)
    ├─ limit = Math.min(Number(query.limit) || 20, 100)  ← max 100 per page
    ├─ skip  = (page - 1) * limit
    │
    ├─ Parallel:
    │   ├─ findMessages({ chatId, skip, limit, sort:{createdAt:-1}, currentUserId })
    │   │   └─ Message.find({
    │   │        chatId,
    │   │        deletedFor: { $nin: [currentUserId] },  ← filter "delete for me"
    │   │        isDeleted: false                         ← filter delete-for-everyone
    │   │      })
    │   │       .populate("sender", "username profile")
    │   │       .populate("replyTo")
    │   │       .sort({ createdAt: -1 })
    │   │       .skip(skip).limit(limit)
    │   │
    │   └─ countMessages(chatId, currentUserId)
    │       └─ Message.countDocuments({ chatId, deletedFor: {$nin:[userId]}, isDeleted: false })
    │
    ├─ messages.reverse()  ← was sorted desc for pagination, flip to asc for display
    │
    └─ returns { messages, pagination: { total, totalPages, currentPage, hasNext, hasPrev } }
```

---

## 30. Message Module — Star / Unstar

```
POST /api/v1/messages/:messageId/star
       │
       ▼
starMessage → starMessageService({ messageId, userId })
    │
    ├─ findMessageById(messageId) → 404 if not found
    ├─ assertParticipant(message.chatId, userId)
    └─ starMessage(messageId, userId)
        └─ Message.findByIdAndUpdate(messageId, { $addToSet: { starredBy: userId } })

DELETE /api/v1/messages/:messageId/star
    └─ Message.findByIdAndUpdate(messageId, { $pull: { starredBy: userId } })

GET /api/v1/messages/starred?chatId=...
    └─ Message.find({ chatId, starredBy: { $in: [userId] } })
```

---

## 31. Message Module — Disappearing Messages

```
PATCH /api/v1/messages/:messageId/disappear
  { timer: 3600 }   ← seconds until deletion (0 = disable)
       │
       ▼
setDisappearTimer → setDisappearTimerService({ messageId, userId, timer })
    │
    ├─ findMessageById → 404
    ├─ assertParticipant
    ├─ assertMessageOwner → 403
    │
    ├─ timer > 0?
    │   └─ disappearsAt = new Date(Date.now() + timer * 1000)
    └─ Message.findByIdAndUpdate(messageId, { $set: { disappearsAt } })

NOTE: A scheduled job (cron or BullMQ delayed job) must poll/check disappearsAt.
      The expiry field is written but the actual deletion worker is outside this flow.
```

---

## 32. Media Upload Module — Presign → PUT → Confirm

```
Step 1: Client requests a presigned upload URL

POST /api/v1/uploads/presign   { mimetype: "image/jpeg", size: 36552 }
       │
       ▼
[1] protect
[2] presignUpload → presignUploadService({ mimetype, size, userId })

presignUploadService
    │
    ├─ Guard: S3 config present?
    │   └─ !S3_ENDPOINT OR !S3_ACCESS_KEY → 503 "Storage service unavailable"
    │
    ├─ Determine folder from mimetype:
    │   "image/*"       → "image"
    │   "video/*"       → "video"
    │   "audio/*"       → "audio"
    │   "application/*" → "document"
    │   else            → "other"
    │
    ├─ key = "uploads/<folder>/<userId>/<uuid>.<ext>"
    │
    ├─ new S3Client({ endpoint: S3_ENDPOINT, region, credentials: { accessKeyId, secretAccessKey } })
    │
    ├─ getSignedUrl(s3Client, PutObjectCommand({ Bucket, Key: key, ContentType: mimetype }), { expiresIn: 300 })
    │   └─ Returns a pre-signed URL with HMAC signature valid for 5 minutes
    │
    └─ returns { uploadUrl, key, mediaUrl: S3_ENDPOINT/<bucket>/<key>, mediaType: <folder> }

RESPONSE: { uploadUrl, key, mediaUrl, mediaType }

──────────────────────────────────────────────────────────────

Step 2: Client uploads directly to MinIO/S3 (BACKEND NOT INVOLVED)

PUT <uploadUrl>
  Content-Type: image/jpeg
  Body: <binary file data>
       │
       ▼
MinIO stores file at key in vami-media bucket
RESPONSE: 200 OK (from MinIO directly)

──────────────────────────────────────────────────────────────

Step 3: Client confirms the upload

POST /api/v1/uploads/confirm   { key: "uploads/image/userId/abc.jpg" }
       │
       ▼
confirmUpload → confirmUploadService({ key })
    │
    ├─ Guard: key present
    ├─ Guard: S3 config present → 503 if not
    │
    ├─ s3Client.send(new HeadObjectCommand({ Bucket, Key: key }))
    │   └─ HeadObject checks file exists WITHOUT downloading it
    │   └─ Throws NotFound if key doesn't exist
    │
    ├─ Error? → 400 "File not found in storage" or propagate
    │
    └─ returns { exists: true, contentType: <from S3 metadata> }

RESPONSE: { exists: true, contentType: "image/jpeg" }

──────────────────────────────────────────────────────────────

Step 4: Client sends the message (see §13)
```

---

## 33. BullMQ Media Processing Queue

```
sendMessageService detects mediaKey:
    import("../queues/media.queue.js")
        └─ enqueueMediaProcessing({ messageId, mediaKey, mediaType, mimetype })
            └─ mediaQueue.add("process-media", jobData, { attempts:3, backoff:{type:"exponential"} })

                       ↓ async, separate worker process ↓

Worker picks up job:
    ├─ Download file from MinIO using GetObjectCommand
    ├─ mediaType === "image"?
    │   └─ sharp(buffer).resize(400).toBuffer() → thumbnail
    │   └─ Upload thumbnail to MinIO at "thumbnails/<originalKey>"
    ├─ mediaType === "video"?
    │   └─ ffmpeg extract frame at 0s → thumbnail
    ├─ Update message.thumbnailUrl in MongoDB
    └─ Acknowledge job complete

On failure:
    └─ BullMQ retries up to 3 times with exponential backoff
    └─ Failed jobs move to "failed" set — inspectable via Bull Board UI
```

---

## 34. Status / Stories Module

```
POST /api/v1/statuses    { content, mediaUrl?, mediaType?, duration? }
       │
       ▼
[1] protect
[2] createStatus → createStatusService({ userId, content, mediaUrl, mediaType, duration })
    │
    ├─ new Status({ userId, content, mediaUrl, mediaType, expiresAt: 24h from now }).save()
    │
    └─ Notify contacts:
        getContactIds(userId) → all conversation partners
        for each contactId:
            emitToUser(contactId, "contact_status_updated", { userId, status })

──────────────────────────────────────────────────────────────

GET /api/v1/statuses     ← fetch all contact statuses (feed)
    └─ Find all contacts
       For each contact: Status.find({ userId: contactId, expiresAt: {$gt: now} })
       Returns grouped: [{ user, statuses: [...] }]

──────────────────────────────────────────────────────────────

POST /api/v1/statuses/:statusId/view
    └─ Status.findByIdAndUpdate(statusId, { $addToSet: { viewers: userId } })
    └─ emitToUser(status.userId, "status_viewed", { statusId, viewerId })

──────────────────────────────────────────────────────────────

Socket events for statuses (frontend subscribes):

Client: socket.emit("subscribe_statuses")
    └─ socket.join("statuses:<userId>")
       Allows emitToUser("statuses:<userId>", event, data)

Client: socket.emit("unsubscribe_statuses")
    └─ socket.leave("statuses:<userId>")
```

---

## 35. Push Notifications Module

```
POST /api/v1/push/subscribe   { endpoint, keys: { p256dh, auth } }
       │
       ▼
[1] protect
[2] subscribePush → savePushSubscription({ userId, subscription })
    └─ PushSubscription.findOneAndUpdate(
         { userId, endpoint },
         { $set: { keys, userId, endpoint } },
         { upsert: true }
       )
    Returns 200

──────────────────────────────────────────────────────────────

Push notification dispatch (called fire-and-forget by sendMessageService):

sendPushToUsers(recipientIds, payload)
    │
    ├─ PushSubscription.find({ userId: { $in: recipientIds } })
    │
    └─ For each subscription:
        webpush.sendNotification(subscription, JSON.stringify({
            title: "Vami",
            body: payload.body,
            url:  payload.url,
        }), {
            vapidDetails: {
                subject: "mailto:admin@vami.app",
                publicKey:  VAPID_PUBLIC_KEY,
                privateKey: VAPID_PRIVATE_KEY,
            }
        })
        └─ Error 410 (subscription expired)? → delete PushSubscription from DB

──────────────────────────────────────────────────────────────

Frontend registration flow (usePushNotifications.js):

initPush()
    │
    ├─ "Notification" in window? NO → return (browser doesn't support)
    ├─ Notification.requestPermission() → "granted" / "denied" / "default"
    ├─ "denied" → return
    ├─ navigator.serviceWorker.ready → swRegistration
    ├─ swRegistration.pushManager.subscribe({
    │     userVisibleOnly: true,
    │     applicationServerKey: VAPID_PUBLIC_KEY  ← from runtimeConfig
    │   })
    │   └─ Browser negotiates with push service (FCM/Mozilla)
    │   └─ Returns PushSubscription object
    │
    └─ POST /api/v1/push/subscribe  { endpoint, keys }
```

---

## 36. User Module — Search, Profile, Block

```
GET /api/v1/users/search?q=john
    └─ protect
    └─ User.find({ $text: { $search: q }, _id: {$ne: currentUserId} })
        └─ Uses { username: "text", email: "text" } text index
        └─ Returns [ username, email, profile.avatar, isOnline ]

──────────────────────────────────────────────────────────────

GET /api/v1/users/profile
    └─ protect
    └─ Returns req.user (set by protect middleware)

PUT /api/v1/users/profile   { username?, bio?, avatar? }
    └─ protect + validate
    └─ User.findByIdAndUpdate(userId, { $set: { username, "profile.bio", "profile.avatar" } })
    └─ cacheDel("user:<userId>")  ← invalidate socket auth cache

──────────────────────────────────────────────────────────────

POST /api/v1/users/block/:userId
    └─ protect
    └─ User.findByIdAndUpdate(currentUserId, { $addToSet: { blockedUsers: targetUserId } })
    └─ accessChatService will 403 both parties going forward

DELETE /api/v1/users/block/:userId
    └─ protect
    └─ User.findByIdAndUpdate(currentUserId, { $pull: { blockedUsers: targetUserId } })
```

---

## 37. Error Handling Pipeline

```
ANY point in Express middleware or controllers:
    throw new ApiError(statusCode, message, errors?, stack?)
    OR
    next(new ApiError(statusCode, message))
    OR
    asyncHandler catches rejected Promise → next(err)
       │
       ▼
errorHandler(err, req, res, next)  ← registered last in app.js
    │
    ├─ err instanceof ApiError?
    │   YES → use as-is
    │   NO  → is it mongoose.Error?
    │         YES → statusCode = 400
    │         NO  → statusCode = 500
    │         message = err.message || "Something went wrong"
    │         error = new ApiError(statusCode, message, err.errors, err.stack)
    │
    ├─ response = {
    │     ...error,
    │     message: error.message,
    │     ...(NODE_ENV === "development" ? { stack } : {})
    │   }
    │
    └─ sendResponse(res, error.statusCode, error.message, response)
        └─ {
             statusCode: <N>,
             success: false,
             message: "...",
             data: { ...error fields }
           }

ApiError class:
    constructor(statusCode, message, errors=[], stack="") {
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        this.errors = errors;
        (stack provided) ? this.stack = stack : Error.captureStackTrace(this);
    }
```

---

## 38. Frontend — App Boot Sequence

```
Browser loads index.html (served by Nuxt SPA)
       │
       ▼
Vue app initializes — Nuxt bootstraps:

1. plugins run in order:
   ├─ error-handler.client.js
   │   └─ vueApp.config.errorHandler = (err) => console.error(err)
   │   └─ hook("vue:error", ...)
   │   └─ hook("app:error", ...)
   │
   └─ socket.client.js
       └─ provide("$socket", socketClient)
           └─ socketClient is module-level singleton (not yet connected)

2. Pinia stores initialize:
   └─ auth.store.js._hydrateUser()
       └─ getLocalStorageItem("vami_user") → parse JSON
       └─ user.value = parsed || null
       └─ token.value = null  ← ALWAYS null on boot; access token in-memory only

3. Route navigation begins
   └─ auth.js or guest.js middleware is evaluated
   └─ See §39 and §40
```

---

## 39. Frontend — Route Guard: auth Middleware

```
Navigation to any page with definePageMeta({ middleware: "auth" })
(applies to: /chat, /profile)
       │
       ▼
middleware/auth.js
    │
    ├─ authStore.isAuthenticated?
    │   = computed: !!token.value && !!user.value
    │   = true → ALLOW navigation
    │   = false (first check, token is null after refresh) ↓
    │
    └─ authStore.refreshAccessToken()
        │
        ├─ POST /api/v1/auth/refresh  (no body — browser sends HttpOnly cookie)
        │   ├─ Cookie valid, not blacklisted?
        │   │   └─ 200: { user, token: newAccessToken }
        │   │       ├─ token.value = newAccessToken  (in memory)
        │   │       ├─ user.value = user
        │   │       ├─ localStorage("vami_user") = JSON.stringify(user)
        │   │       └─ return true
        │   │
        │   └─ Cookie missing / expired / blacklisted?
        │       └─ 401
        │           ├─ user.value = null
        │           ├─ token.value = null
        │           ├─ removeLocalStorageItem("vami_user")
        │           └─ return false
        │
        ├─ returned true  → ALLOW navigation
        └─ returned false → navigateTo("/login")
```

---

## 40. Frontend — Route Guard: guest Middleware

```
Navigation to /login or /register
       │
       ▼
middleware/guest.js
    │
    └─ authStore.isAuthenticated?
        YES → navigateTo("/chat")   ← already logged in, skip login page
        NO  → ALLOW navigation
```

---

## 41. Frontend — Login Page Flow

```
User lands on /login
    └─ guest.js: not authenticated → render page

<LoginForm> mounted
    └─ authStore.error = null

User enters email/password → clicks "Login"
       │
       ▼
LoginForm.handleSubmit()
    │
    ├─ isLoading.value = true
    ├─ authStore.error = null
    │
    └─ authStore.login({ email, password })

auth.store.js → login()
    │
    ├─ authService.login({ email, password })
    │   └─ apiFetch("/auth/login", {
    │         method: "POST",
    │         body: { email, password }
    │       })
    │   └─ Server validates → sets refreshToken cookie → responds with { user, token }
    │
    ├─ On success:
    │   └─ _persistSession(user, token)
    │       ├─ user.value = user
    │       ├─ token.value = accessToken
    │       └─ setLocalStorageItem("vami_user", JSON.stringify(user))
    │
    ├─ return true
    │
    └─ On error:
        ├─ authStore.error = err?.data?.message || "Login failed"
        └─ return false

LoginForm receives true → navigateTo("/chat")
LoginForm receives false → <Alert> shows authStore.error

isLoading.value = false (finally)
```

---

## 42. Frontend — Register Page Flow

```
User fills RegisterForm → clicks "Create Account"
       │
       ▼
RegisterForm.handleSubmit()
    │
    └─ authStore.register({ username, email, password })

auth.store.js → register()
    │
    ├─ authService.register({ username, email, password })
    │   └─ POST /api/v1/auth/register
    │   └─ Server: validate → check unique → create user →
    │              fire-and-forget verification email →
    │              return { user, token }
    │
    ├─ _persistSession(user, token)  ← same as login
    │
    └─ return true → navigateTo("/chat")

NOTE: User is immediately logged in after register.
      Email verification is not required to use the app (emailVerified is informational).
```

---

## 43. Frontend — useApiFetch — 401 Interceptor

```
Component/Store calls: apiFetch("/endpoint", options)
       │
       ▼
useApiFetch.js → apiFetch(url, options)
    │
    ├─ Read authStore.token (in-memory)
    ├─ options._retry = false (default)
    │
    ├─ $fetch(url, {
    │     baseURL: config.public.apiBaseUrl,
    │     headers: { Authorization: `Bearer ${token}` },
    │     ...options
    │   })
    │
    ├─ SUCCESS → return response
    │
    └─ ERROR (ofetch throws on non-2xx):
        ├─ err.status === 401?
        │   AND !options._retry?
        │   AND url is not an auth endpoint?
        │   YES →
        │       ├─ success = await authStore.refreshAccessToken()
        │       ├─ success?
        │       │   └─ retry: apiFetch(url, { ...options, _retry: true })
        │       │       └─ Uses refreshed token this time
        │       └─ fail?
        │           └─ navigateTo("/login")
        │
        └─ Other error / already retry / auth endpoint → re-throw
            └─ Caller handles it (shows error message)
```

---

## 44. Frontend — Socket Initialization

```
chat.vue onMounted()
       │
       ▼
chatStore.initializeSocket(authStore.token)

chat.store.js → initializeSocket(token)
    │
    ├─ socketClient.connect(token)  [lib/socket.client.js]
    │   └─ io(SOCKET_URL, {
    │         auth: { token },
    │         transports: ["websocket"],
    │         reconnectionAttempts: 5,
    │         reconnectionDelay: 2000,
    │       })
    │   └─ Backend validates token via socketAuth middleware (see §10)
    │   └─ Connection established
    │
    ├─ useSocket() reactive refs update:
    │   isConnected.value = true
    │
    └─ Register all socket event handlers via socket.on():
        ├─ "receive_message"         → see §47
        ├─ "new_message_notification"→ increment unreadCount on sidebar
        ├─ "message_status_update"   → _patchMessage: update status field
        ├─ "message_delivered"       → _patchMessage: update status to "delivered"
        ├─ "message_reaction_updated"→ _patchMessage: update reactions array
        ├─ "message_edited"          → _patchMessage: update content + isEdited
        ├─ "message_deleted"         → scope "everyone": patch; scope "me": remove
        ├─ "user_status_update"      → onlineUsers Set: add/remove userId
        ├─ "user_typing"             → typingUsers Set: add with 3s auto-remove timeout
        ├─ "user_stopped_typing"     → typingUsers Set: remove immediately
        ├─ "group_updated"           → activeChat.value = updated conversation
        ├─ "group_member_added"      → push new participant to activeChat.participants
        ├─ "group_member_left"       → filter out participant from activeChat
        ├─ "group_admin_promoted"    → add userId to admins array
        └─ "group_admin_demoted"     → remove userId from admins array

chat.vue also registers status socket events:
    ├─ "contact_status_updated" → statusStore.upsertStatus(status)
    ├─ "contact_status_deleted" → statusStore.removeStatus(statusId)
    └─ "status_viewed"          → statusStore.incrementViews(statusId)
```

---

## 45. Frontend — Sending a Text Message

```
User types "Hello" → presses Enter

MessageComposer.vue → handleSubmit()
    │
    ├─ Guard: text.trim() empty AND no pending file → return
    ├─ replyingMessage = chatStore.replyingTo  ← capture before clearing
    ├─ text = inputText.value.trim()
    ├─ inputText.value = ""   ← clear input immediately
    ├─ chatStore.replyingTo = null
    │
    └─ chatStore.sendMessage({
           content: text,
           replyToId: replyingMessage?._id,
       })

chat.store.js → sendMessage(payload)
    │
    ├─ type = "text"  (no mediaKey)
    │
    ├─ optimisticMsg = {
    │     _id: "temp-" + Date.now(),
    │     content: payload.content,
    │     type: "text",
    │     sender: { _id: currentUserId, username, profile },
    │     chatId: activeChat.value._id,
    │     status: "sending",   ← clock icon on bubble
    │     _optimistic: true,
    │     createdAt: new Date(),
    │     replyTo: replyingMessage || null,
    │   }
    │
    ├─ messages.value = [...messages.value, optimisticMsg]
    │   └─ UI renders message IMMEDIATELY (clock icon)
    │
    ├─ socket.emit("send_message", {
    │     roomId: activeChat.value._id,
    │     content: payload.content,
    │     type: "text",
    │     replyToId: payload.replyToId,
    │   })
    │
    [Socket round-trip: see §12]
    │
    └─ "receive_message" event arrives from server (see §47)
        └─ Optimistic message replaced with DB-confirmed version
           (real _id, timestamps, status:"sent")
```

---

## 46. Frontend — Sending a Media Message

```
User clicks attach → picks image.jpg (36552 bytes, image/jpeg)

MessageComposer.vue → handleFileSelected(event)
       │
       ▼
Step 1: isUploading.value = true; uploadProgress.value = 0

Step 2: POST /api/v1/uploads/presign  { mimetype: "image/jpeg", size: 36552 }
    ← { uploadUrl, key, mediaUrl, mediaType: "image" }

Step 3: PUT uploadUrl  (XHR for progress tracking)
    onprogress: uploadProgress.value = (loaded/total) * 100
    ← 200 OK from MinIO

Step 4: POST /api/v1/uploads/confirm  { key }
    ← { exists: true }

Step 5:
    chatStore.sendMessage({
        content: null,
        mediaKey: key,
        mediaUrl: mediaUrl,
        mediaMimeType: "image/jpeg",
        mediaSize: 36552,
    })
       │
       ▼
chat.store.js → sendMessage()
    │
    ├─ type = "image"  (inferred: "image/jpeg".startsWith("image/"))
    │   "video/*"     → "video"
    │   "audio/*"     → "audio"  or "voice" if from mic recording
    │   else          → "document"
    │
    ├─ optimisticMsg = { type: "image", mediaUrl, _optimistic: true, ... }
    ├─ messages.value = [...messages.value, optimisticMsg]
    │   └─ Image preview shown immediately (from mediaUrl — MinIO already has the file)
    │
    └─ socket.emit("send_message", { roomId, type:"image", mediaKey, mediaUrl, mediaMimeType, mediaSize })

isUploading.value = false
```

---

## 47. Frontend — Receiving a Message

```
Server emits: socket.emit (or io.to(roomId).emit) "receive_message" with Message document
       │
       ▼
chat.store.js socket handler: receive_message
    │
    ├─ message.chatId === activeChat.value._id?
    │   YES (message for active chat):
    │   │
    │   ├─ Find optimistic message:
    │   │   messages.value.find(m =>
    │   │     m._optimistic &&
    │   │     m.content === message.content &&   ← text match
    │   │     m.chatId === message.chatId        ← same room
    │   │   )
    │   │
    │   ├─ Found optimistic?
    │   │   YES → replace it: messages.value = messages.value.map(m =>
    │   │             m._id === optimistic._id ? message : m
    │   │           )
    │   │         └─ Real _id, real timestamps, status:"sent" (single tick)
    │   │
    │   └─ Not found (message from someone else)?
    │       └─ messages.value = [...messages.value, message]
    │           └─ New message appended, triggers scroll-to-bottom if near bottom
    │
    └─ message.chatId !== activeChat?
        └─ (handled by new_message_notification for unread count)

_updateSidebarLatestMessage(message.chatId, message)
    └─ conversations.value = conversations.value.map(c =>
           c._id === message.chatId ? { ...c, latestMessage: message } : c
         )
       └─ Sidebar preview text updates
```

---

## 48. Frontend — Timeline Pipeline

```
INPUT: messages.value  (raw array from API + socket)
       E.g.: [ {type:"image", sender:...}, {type:"text", ...}, ... ]
       │
       ▼
useChatBody.js → timelineItems computed:

Step 1: Stamp each message with _row: "message"
    raw = messages.value.map(msg => ({ ...msg, _row: "message" }))
          ↑ 
          _row = registry key  (what component ChatRow.vue uses)
          type = UNTOUCHED      (what MessageContent.vue uses for image/video/etc.)

Step 2: TIMELINE_TRANSFORMS.reduce((items, transform) => transform(items, ctx), raw)

──────────────────────────────────────────────────────────────

Transform 1: injectSenderClusters(items, ctx)
    For each item where item._row === "message":
        │
        ├─ item.isSystemMessage?
        │   └─ item._row = "system_alert"  ← changes row type only
        │
        ├─ same sender as previous message?
        │   AND within 10 minutes of previous?
        │   YES → isFirstInCluster = false
        │   NO  → isFirstInCluster = true
        │         (show avatar + sender name on this bubble)
        │
        └─ { ...item, isFirstInCluster }

──────────────────────────────────────────────────────────────

Transform 2: injectDateSeparators(items, ctx)
    For each message item:
        │
        ├─ same date as previous message (day/month/year)?
        │   YES → no separator
        │
        └─ NO → insert BEFORE this item:
            { _row: "date_separator", id: "sep-<ts>", label: "Today" | "Yesterday" | "Mon, Mar 3" }

──────────────────────────────────────────────────────────────

Transform 3: injectWelcomeCard(items, ctx)
    │
    ├─ Any items with _row === "message"?
    │   YES → no welcome card
    │
    └─ NO → prepend:
        { _row: "welcome_card", chat: ctx.activeChat }

──────────────────────────────────────────────────────────────

Transform 4: injectTypingIndicator(items, ctx)
    │
    ├─ ctx.typingUsers.size > 0?
    │   YES → append: { _row: "typing", users: [...ctx.typingUsers] }
    │
    └─ NO → no change

──────────────────────────────────────────────────────────────

OUTPUT: timelineItems  →  ChatBody.vue renders each item via ChatRow.vue

ChatRow.vue dispatch:
    entry = ROW_REGISTRY[item._row ?? item.type]
    ├─ "message"         → <MessageRow>  → <MessageBubble> → <MessageContent>
    ├─ "date_separator"  → <DateSeparatorRow>
    ├─ "system_alert"    → <SystemAlertRow>
    ├─ "typing"          → <TypingIndicatorRow>
    └─ "welcome_card"    → <WelcomeCardRow>
```

---

## 49. Frontend — MessageContent Render Decision Tree

```
MessageContent.vue receives: message = { type, content, mediaUrl, attachments?, ... }
       │
       ▼
mediaType computed:
    │
    ├─ message.type exists AND message.type !== "text"?
    │   └─ return message.type  ("image" | "video" | "audio" | "voice" | "document")
    │
    ├─ message.attachments?.length > 0  (legacy format support)?
    │   └─ infer from attachment[0].mimetype
    │       "image/*"  → "image"
    │       "video/*"  → "video"
    │       else       → "document"
    │
    └─ return "text"

Template branch:

mediaType === "image"
    └─ <img :src="message.mediaUrl || attachment.url"
            class="rounded-lg max-w-xs cursor-pointer"
            @click="openLightbox" />

mediaType === "video"
    └─ <video :src="message.mediaUrl" controls preload="metadata"
              class="rounded-lg max-w-xs" />

mediaType === "audio" | "voice"
    └─ <div class="audio-player">
           <MicIcon v-if="type === 'voice'" />
           <audio :src="message.mediaUrl" controls />
           <span>{{ formatDuration(message.mediaDuration) }}</span>
       </div>

mediaType === "document"
    └─ <div class="file-card">
           <FileIcon />
           <span>{{ filename }}</span>
           <span>{{ formatBytes(message.mediaSize) }}</span>
           <a :href="message.mediaUrl" download>Download</a>
       </div>

mediaType === "text" (default)
    └─ message.isDeleted?
       YES → <p class="italic text-gray-400">This message was deleted</p>
       NO  → <p>{{ message.content }}</p>
              (supports basic markdown: **bold**, `code`, etc.)
```

---

## 50. Frontend — Auth Store State Machine

```
STATES: { user: null, token: null }  ←→  { user: {...}, token: "..." }

                    ┌──────────────────────────────────┐
                    │           UNAUTHENTICATED         │
                    │   user = null, token = null       │
                    └──────────────────────────────────┘
                         │                    ▲
            login() / register()           logout()
            or refreshAccessToken()        or refresh fails
            success                             │
                         │                      │
                         ▼                      │
                    ┌──────────────────────────────────┐
                    │           AUTHENTICATED           │
                    │   user = {...}, token = "15m JWT" │
                    └──────────────────────────────────┘
                         │
                    token expires
                    (15 minutes)
                         │
                         ▼
                    ┌──────────────────────────────────┐
                    │           NEEDS REFRESH           │
                    │   user = hydrated from LS,        │
                    │   token = null                    │
                    └──────────────────────────────────┘
                         │
              auth middleware triggers
              refreshAccessToken()
                         │
              ┌──────────┴──────────┐
         cookie valid?         cookie expired /
         new tokens issued     blacklisted
              │                      │
              ▼                      ▼
     AUTHENTICATED            UNAUTHENTICATED
                               redirect /login

PERSISTENCE STRATEGY:
  token      → memory ONLY (gone on page refresh, recovered via cookie)
  user       → localStorage "vami_user" (survives page refresh for UI hydration)
  refreshToken → HttpOnly cookie (inaccessible to JS, path: /api/v1/auth only)
```

---

## 51. Redis Key Namespace Map

```
Key Pattern                     TTL         Purpose
──────────────────────────────────────────────────────────────────────────────
rt:bl:<jti>                     residual    Refresh token blacklist (revoked JTIs)
ev:<32-byte-hex>                86400s      Email verification token → userId
user:<userId>                   300s        Cached user document (socket auth)
user_chats:<userId>             variable    Cached conversation list
rl:auth:<ip>                    900s        Auth rate limit window counter (50 req/15min)
rl:api:<ip>                     60s         API rate limit window counter (10k req/min)
statuses:<userId>               N/A         Socket.IO room name for status feeds
<roomId>  (Socket.IO room)      N/A         Socket.IO room for a conversation
<userId>  (Socket.IO room)      N/A         Socket.IO personal room for notifications
```

---

## 52. MongoDB Write Chain — Every Document Touched per Send Message

```
Client sends a message (text or media)
       │
       ▼
Every MongoDB operation that occurs in SEQUENCE (sync) or PARALLEL:

SEQUENTIAL:
  1. Message.create({
       sender, chatId, content, type,
       mediaKey?, mediaUrl?, mediaMimeType?, mediaSize?,
       replyTo?, isSystemMessage
     })
     INDEXES HIT: chatId (query), sender (populate)

PARALLEL (Promise.all):
  2. Conversation.findByIdAndUpdate(chatId, { $set:{ latestMessage: messageId } })
     ← Sidebar preview text update

  3. ConversationParticipant.updateMany(
       { conversation: chatId, user: { $ne: senderId } },
       { $inc: { unreadCount: 1 } }
     )
     ← Increment unread count for all other participants

FIRE AND FORGET (no await):
  4. Conversation.findById(chatId)  ← find offline participants for push
  5. PushSubscription.find({ userId: { $in: offlineUserIds } })
  6. [web-push.sendNotification(sub, payload) for each subscription]
     └─ 410 responses: PushSubscription.deleteOne(sub.endpoint)

ASYNC (BullMQ worker, separate process):
  7. Message.findByIdAndUpdate(messageId, { $set:{ thumbnailUrl } })
     ← After thumbnail generation completes

TRIGGERED ON join_room:
  8. Message.updateMany(
       { chatId, sender:{$ne:userId}, "deliveries.userId":{$ne:userId} },
       { $push:{ deliveries:{ userId, status:"delivered" } } }
     )

TRIGGERED ON message_read:
  9. Message.findByIdAndUpdate(messageId, {
       $push:{ deliveries:{ userId, status:"read" } }
     })
```

---

*End of CODEFLOW.md — all modules, all decision branches, all function calls documented.*
