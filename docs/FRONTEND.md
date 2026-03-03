# Vami Frontend — Complete Code Documentation

## Overview

The frontend is a **Nuxt 3 SPA** (Server-Side Rendering disabled). All rendering happens in the browser. The app is structured as a module-based Vue 3 Composition API application using Pinia for state and Socket.IO for real-time updates.

---

## Directory Structure

```
vami-nuxt/app/
├── app.vue                         ← Root component (NuxtLayout + NuxtPage)
├── error.vue                       ← Global error boundary page
├── assets/css/style.css            ← Global Tailwind CSS
│
├── composables/                    ← Global composables (auto-imported)
│   ├── useApiFetch.js              ← Authenticated HTTP client
│   ├── useClickOutside.js          ← Directive for closing dropdowns
│   └── useDebounce.js              ← Debounce utility
│
├── layouts/
│   ├── default.vue                 ← Blank layout
│   ├── auth.vue                    ← Centered card layout for login/register
│   └── chat.vue                    ← Full-screen layout for the chat page
│
├── middleware/
│   ├── auth.js                     ← Redirects unauthenticated users to /login
│   └── guest.js                    ← Redirects authenticated users to /chat
│
├── pages/
│   ├── index.vue                   ← / redirects to /chat
│   ├── login.vue                   ← Login page
│   ├── register.vue                ← Register page
│   ├── chat.vue                    ← Main chat page (socket init, layout)
│   └── profile.vue                 ← Profile settings page
│
├── plugins/
│   ├── socket.client.js            ← Provides $socket via Nuxt plugin
│   └── error-handler.client.js     ← Global Vue error boundary
│
├── services/                       ← Global HTTP service factories
│   ├── auth.service.js             ← login(), register(), refresh(), logout()
│   └── user.service.js             ← getProfile(), updateProfile(), search()
│
├── stores/
│   └── auth.store.js               ← Authentication state (Pinia)
│
├── utils/
│   └── localstorage.utils.js       ← Safe localStorage wrappers
│
└── components/
    ├── ui/                         ← Atomic design system
    │   ├── atoms/                  ← Button, Input, Avatar, Alert, Tooltip
    │   └── molecules/              ← Compound components
    │
    └── modules/chat/               ← The entire chat feature module
        ├── lib/
        │   └── socket.client.js    ← Socket.IO singleton class
        ├── composables/
        │   ├── useSocket.js        ← Reactive socket wrapper
        │   ├── usePanelManager.js  ← Panel navigation state machine
        │   └── usePushNotifications.js ← Web Push registration
        ├── services/
        │   └── chat.service.js     ← All chat HTTP calls
        ├── stores/
        │   ├── chat.store.js       ← All chat/message/socket state
        │   └── status.store.js     ← Status/stories state
        ├── layout/
        │   ├── ChatLayout.vue      ← 3-column responsive layout shell
        │   └── PanelContainer.vue  ← Dynamic panel renderer
        ├── LeftSidebar/
        │   ├── views/
        │   │   └── MainChatList.vue
        │   ├── sections/           ← Chat list, search results, empty state
        │   ├── composables/
        │   │   └── useSidebarBody.js ← Section pipeline runner
        │   └── config/
        │       ├── section-registry.config.js ← Maps type → component
        │       └── section-pipeline.config.js ← Transforms for sidebar items
        ├── ChatWindow/
        │   ├── ChatWindow.vue      ← Wires ChatHeader + ChatBody + MessageComposer
        │   ├── ChatHeader.vue      ← Title, info toggle button
        │   ├── ChatBody.vue        ← Scroll container + ChatRow list
        │   ├── ChatRow.vue         ← Dynamic row renderer (uses ROW_REGISTRY)
        │   ├── MessageBubble.vue   ← Bubble with ticks, reactions, reply-to
        │   ├── MessageContent.vue  ← Renders content based on message.type
        │   ├── MessageComposer.vue ← Text input + file upload + reply banner
        │   ├── rows/               ← Row components: MessageRow, DateSeparatorRow, etc.
        │   ├── composables/
        │   │   └── useChatBody.js  ← Timeline pipeline + scroll logic
        │   └── config/
        │       ├── row-registry.config.js      ← Maps _row key → component
        │       └── timeline-pipeline.config.js ← Transforms raw messages into timeline
        └── RightSidebar/
            └── views/
                ├── ChatInfoPanel.vue ← Group/contact info, members, settings
                └── StatusFeedPanel.vue ← Status stories viewer
```

---

## `nuxt.config.ts`

| Setting | Value | Why |
|---|---|---|
| `ssr: false` | SPA mode | Chat uses localStorage, socket.io, browser APIs — SSR would complicate all of these |
| `modules: ["@pinia/nuxt"]` | Pinia | State management |
| `imports.dirs` | chat composables + stores | Makes `useChatStore()`, `useSocket()` etc. auto-imported everywhere — no manual imports |
| `runtimeConfig.public` | `apiBaseUrl`, `socketUrl` | URL configuration, overridable via `NUXT_PUBLIC_*` env vars |
| Tailwind via Vite plugin | `@tailwindcss/vite` | Tailwind CSS v4 must be integrated as a Vite plugin, not a PostCSS plugin |

---

## Plugins

### `socket.client.js`
Registers the `socketClient` singleton as a Nuxt plugin providing `$socket`. The `.client.js` suffix means Nuxt only runs this plugin in the browser (never during SSR/build).

```js
export default defineNuxtPlugin(() => ({
  provide: { socket: socketClient }
}));
```

After registration, `useNuxtApp().$socket` is available anywhere, but in practice the chat module uses `useSocket()` composable instead (which wraps the same singleton with reactive state).

### `error-handler.client.js`
Registers three error hooks:
1. `vueApp.config.errorHandler` — catches errors thrown inside Vue component lifecycle hooks and event handlers
2. `vue:error` — catches errors that propagated up the component tree
3. `app:error` — catches Nuxt-level errors

All three just `console.error` in development. In production you would send to a monitoring service like Sentry here.

---

## Layouts

### `default.vue`
Empty — just `<slot />`. Used for the index redirect page.

### `auth.vue`
Centers content in the viewport. Used by login and register pages.

### `chat.vue`
```html
<div class="h-screen w-full overflow-hidden"><slot /></div>
```
Full-screen, hidden overflow. The chat's 3-column layout fills this entirely.

---

## Middleware

### `auth.js`
Runs **before** navigation to any page that has `definePageMeta({ middleware: "auth" })`.

```
isAuthenticated?
  YES → continue navigation
  NO  → try refreshAccessToken() via cookie
        Success → continue
        Fail    → redirect to /login
```

Silent refresh means users stay logged in across browser restarts as long as their refresh token (cookie) is still valid.

### `guest.js`
Inverse of auth. Applied to `/login` and `/register`. If user is already authenticated, redirect to `/chat`. Prevents logged-in users from seeing the login page.

---

## Global Composables

### `useApiFetch.js`

The unified HTTP client. Every API call in the app goes through this.

**How it works:**
1. Creates an `apiFetch(url, options)` function
2. Reads `authStore.token` (in-memory access token)
3. Adds `Authorization: Bearer <token>` header
4. Calls Nuxt's `$fetch` with `baseURL: config.public.apiBaseUrl`
5. **401 interceptor**: If response is 401 AND not a retry AND not an auth endpoint:
   - Calls `authStore.refreshAccessToken()`
   - If refresh succeeded: retries original request with `_retry: true` flag (prevents infinite loop)
   - If refresh failed: `navigateTo("/login")`

**Why not axios?**
Nuxt 3's `$fetch` (based on `ofetch`) is the recommended approach. It natively handles JSON parsing, throws on non-2xx, and works identically in browser and server environments.

### `useDebounce.js`
Returns a debounced version of a function. Used in search inputs.

### `useClickOutside.js`
Vue directive or composable that calls a callback when a click occurs outside a target element. Used by dropdowns and context menus.

---

## Stores

### `auth.store.js` — Authentication State

**State:**
```js
user  = ref(null)    // hydrated from localStorage on startup
token = ref(null)    // ONLY in memory — never persisted
```

**Why token is never in localStorage:**
XSS attacks can steal localStorage data. The access token is kept only in memory. The refresh token is in an HttpOnly cookie (inaccessible to JavaScript). On page refresh, `token` is null — `auth.js` middleware triggers `refreshAccessToken()` which uses the cookie to get a new token silently.

**`_hydrateUser()`**: On store initialization, tries to parse `vami_user` from localStorage. This allows the UI to show the user's name/avatar immediately on load without waiting for an API call.

**`login(credentials)`**:
1. Calls `authService.login()`
2. Destructures `{ user, token }` from `response.data`
3. Calls `_persistSession(user, token)`:
   - `user.value = userData` (reactive)
   - `token.value = accessToken` (in memory only)
   - `setLocalStorageItem("vami_user", JSON.stringify(userData))` (for hydration)

**`refreshAccessToken()`**:
1. Calls `POST /auth/refresh` — browser auto-sends HttpOnly cookie
2. On success: updates `token.value` in memory, re-persists user
3. Returns `true` (success) or `false` (fail — cookie expired or missing)

**`logout()`**:
1. Calls `POST /auth/logout` — server blacklists the refresh token JTI
2. Clears cookie via response
3. Calls `_clearSession()` — nulls all state, removes localStorage

---

### `chat.store.js` — The Main Store

This is the largest and most important file in the frontend. It manages all chat state and all Socket.IO event handling.

**State:**
```js
conversations  = shallowRef([])    // sidebar list
activeChat     = ref(null)         // currently open conversation
messages       = shallowRef([])    // messages for active chat
pagination     = ref({})
isLoadingChats = ref(false)
isLoadingMessages = ref(false)
onlineUsers    = ref(new Set())    // Set of userId strings
typingUsers    = ref(new Set())    // Set of userId strings currently typing
replyingTo     = ref(null)         // message being replied to
starredMessages = ref([])
groupInviteLink = ref(null)
```

**`shallowRef` vs `ref`:**
`conversations` and `messages` use `shallowRef` for performance. With thousands of messages, deep reactivity tracking (regular `ref`) would be expensive. `shallowRef` only tracks the top-level assignment — you must reassign the array entirely to trigger reactivity (e.g., `messages.value = [...messages.value, newMsg]`).

**`loadConversations()`**: Fetches all chats from `GET /chats`, assigns them to `conversations.value`.

**`setActiveChat(chat)`**:
1. Sets `activeChat.value = chat`
2. Resets `messages.value = []`
3. Calls `loadMessages(chat._id)`
4. Emits `socket.emit("join_room", chatId)` — server then marks undelivered messages as delivered

**`loadMoreMessages()`**: Handles pagination. Increments `currentPage`, passes `page` query param, prepends older messages to the `messages` array.

**`sendMessage(payload)`**:

This is the optimistic update pattern:
1. Extract all fields from payload (content, mediaKey, mediaUrl, etc.)
2. **Determine message type**: if `mediaKey` is present, infer type from MIME type. Otherwise `"text"`.
3. Build `optimisticMsg` — a fake message with `_id: "temp-<timestamp>"`, `_optimistic: true`, `status: "sending"`
4. **Immediately push** `optimisticMsg` to `messages.value` — user sees the message appear instantly
5. Call `socket.emit("send_message", {...})` — actual DB save happens asynchronously
6. When `receive_message` event arrives from server: find the optimistic message by `_optimistic && content === message.content && same conversation` — replace it with the DB-confirmed version

**Why optimistic updates?**
The message appears instantly in the UI without waiting for the server round-trip. If the socket fails, the optimistic message stays in the "sending" state (showing the clock icon instead of ticks).

**`initializeSocket(authToken)`**:
Connects the socket and registers all event handlers. Called once in `chat.vue` `onMounted`.

Socket event handlers:

| Event | What it does |
|---|---|
| `receive_message` | Replace optimistic OR append new message. Update sidebar preview. |
| `new_message_notification` | Increment unread count on a non-active conversation |
| `message_status_update` | Patch message status (sent/delivered/read) — updates tick icons |
| `message_reaction_updated` | Patch reactions array on a specific message |
| `message_edited` | Patch content + `isEdited: true` on a specific message |
| `message_deleted` | If everyone: `isDeleted: true`. If me: remove from array |
| `user_status_update` | Add/remove userId from `onlineUsers` Set |
| `user_typing` | Add userId to `typingUsers` Set after 3s timeout, remove |
| `group_updated` | Replace the active conversation object with updated data |
| `group_member_added/left` | Update participants array in active conversation |
| `group_admin_promoted/demoted` | Update admins array in active conversation |

**`_patchMessage(messageId, patchFn)`**: Internal helper. Finds a message in `messages.value` by `_id`, calls `patchFn(msg)` to get the updated version, reassigns the array. Used by all "update message" socket handlers.

**`_updateSidebarLatestMessage(chatId, message)`**: Updates the `latestMessage` on the matching conversation in the sidebar list — so the preview text stays current.

---

### `status.store.js` — Status/Stories State

Manages status updates (WhatsApp Stories equivalent). State:
```js
statusFeed = ref([])     // grouped by contact: [{ user, statuses[] }]
myStatuses = ref([])     // current user's own statuses
```

Socket handlers (registered in `chat.vue`):
- `contact_status_updated` — add/update status in feed
- `contact_status_deleted` — remove from feed
- `status_viewed` — increment view count

---

## Chat Module — Core Architecture

### The Socket Singleton: `lib/socket.client.js`

```js
class SocketClient {
  constructor() { this.socket = null; }
  connect(token) { /* creates io() instance */ }
  disconnect() { this.socket.disconnect(); this.socket = null; }
  on(event, cb) { this.socket.off(event); this.socket.on(event, cb); }
  off(event) { this.socket.off(event); }
  emit(event, data) { this.socket.emit(event, data); }
}
export const socketClient = new SocketClient();
```

A JavaScript class with a single exported instance (singleton pattern). The class wraps `socket.io-client`'s `io()` function.

**Why `this.socket.off(event)` in `on()`?**
Prevents duplicate handlers. If `chat.store.js` registers `socket.on("receive_message", handler)` and then `initializeSocket` is called again (e.g., tab focus refresh), the old handler would still be registered — resulting in the same message being processed twice.

**Socket configuration:**
```js
io(SOCKET_URL, {
  auth: { token },          // JWT sent in handshake
  transports: ["websocket"], // skip polling fallback (faster, fewer requests)
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
})
```

---

### `composables/useSocket.js`

Wraps the singleton with **reactive Vue state**:
```js
const isConnected = ref(false)
const isReconnecting = ref(false)
const connectionError = ref(null)
```

These refs are module-level (not inside the function) so all components share the same reactive state. Any component can read `isConnected.value` to show a connection indicator.

`useSocket()` returns: `{ connect, disconnect, emit, on, off, isConnected, isReconnecting, connectionError }`

The `connect()` function registers all the Socket.IO meta-events (`connect`, `disconnect`, `reconnect_attempt`, etc.) to update the reactive state.

---

### The Panel System: `composables/usePanelManager.js`

**Problem it solves:** The chat UI has three panels (left sidebar, center chat, right info). On mobile, only one can be visible at a time. On desktop, multiple can be shown. Navigation between panels (e.g., "click a chat → open ChatWindow → click 'info' → open ChatInfoPanel") needs to be managed centrally.

**How it works:**
- `panelStacks` = `{ left: [], right: [] }` — each side maintains a stack of components
- `openPanel(side, ComponentImport)` — pushes a component onto the stack
- `closePanel(side)` — pops the top component
- `showSidebar`, `showChatWindow`, `isInfoPanelOpen` — derived booleans for layout

`PanelContainer.vue` reads `panelStacks[side]` and renders the top component dynamically using Vue's `<component :is="..." />`.

---

## Timeline Pipeline: `config/timeline-pipeline.config.js`

This is a **functional pipeline** that transforms a flat array of raw message objects into a structured array of "timeline items" suitable for rendering.

**Input:** `Message[]` (raw from API/socket)

**Output:** mixed array of `_row: "message" | "date_separator" | "system_alert" | "welcome_card" | "typing"`

**Pipeline transforms (in order):**

### 1. `injectSenderClusters` (runs first)

For each raw message item (`_row: "message"`):
- Determines if this is the **first in a cluster** — same sender + within 10 minutes of previous message
- Sets `isFirstInCluster: true/false`
- Converts system messages (`isSystemMessage: true`) to `_row: "system_alert"`
- **Critical**: sets `_row: "message"` WITHOUT touching `item.type` — preserves `item.type: "image"` etc.

### 2. `injectDateSeparators`

For each message, checks if the date changed from the previous message. If yes, inserts a `_row: "date_separator"` item before it with a human-readable label ("Today", "Yesterday", "Monday, March 3").

### 3. `injectWelcomeCard`

Checks if there are any real messages in the array. If none (empty chat), prepends a `_row: "welcome_card"` item showing the contact/group info.

### 4. `injectTypingIndicator`

If `typingUsers.size > 0`, appends a `_row: "typing"` item at the end — shows animated dots.

**Why this architecture?**
Each transform is a pure function `(items, ctx) => items`. They're easy to test individually, easy to add/remove, and the ordering is explicit.

---

## Row Registry: `config/row-registry.config.js`

Maps `_row` keys to Vue components and their props:

```js
export const ROW_REGISTRY = {
  message: {
    component: MessageRow,
    resolveProps: (item, ctx) => ({
      message: item,
      isMe: item.sender._id === ctx.currentUserId,
      isFirstInCluster: item.isFirstInCluster,
    }),
  },
  date_separator: {
    component: DateSeparatorRow,
    resolveProps: (item) => ({ label: item.label }),
  },
  // ...
};
```

**`ChatRow.vue`** reads this registry:
```js
const entry = ROW_REGISTRY[props.item._row ?? props.item.type];
```
(Falls back to `item.type` for non-message items like `date_separator` which don't have `_row` set by the pipeline.)

This pattern means adding a new row type requires:
1. Creating a new component in `rows/`
2. Adding one entry to `ROW_REGISTRY`
3. Having a pipeline transform emit items with that `_row` value

No changes needed in `ChatBody.vue` or `ChatRow.vue`.

---

## `useChatBody.js` — The Scroll + Timeline Composable

**Input:** `{ messages, hasNext, hasPrev, loadMore, jumpToLatest, currentUserId, activeChat, typingUsers }`

**Output:** `{ containerRef, timelineItems, scrollToBottom, handleJumpToBottom, showScrollToBottom, isFetchingMore }`

**`timelineItems` computed:**
```js
const raw = messages.value.map(msg => ({ ...msg, _row: "message" }));
//                                          ^^^^^^^^^^^^^^^^^^^^
//                                          Sets the registry key WITHOUT overwriting msg.type
return TIMELINE_TRANSFORMS.reduce((items, transform) => transform(items, ctx), raw);
```

**Scroll behavior:**
- On initial load (`oldVal === 0 && newVal > 0`): snap to bottom
- When near bottom (< 200px from bottom): auto-scroll for new messages
- When far from bottom: show "Jump to bottom" button
- On "load more" (scrolling to top): saves scroll position, loads older messages, restores position

**`isFetchingMore`**: Prevents multiple simultaneous pagination requests. An IntersectionObserver (or scroll event) watches the container — when scrolled to top, triggers `loadMore()`.

---

## Message Rendering Components

### `MessageContent.vue`

**The type-to-renderer map:**
```
message.type === "image"           → <img :src="thumbnailUrl">
message.type === "video"           → <video :src="mediaUrl" controls>
message.type === "audio" | "voice" → <audio :src="mediaUrl" controls> + mic icon
message.type === "document"        → file card with download button
// legacy:
message.attachments (old format)   → image gallery or document list
// default:
message.content                    → <p> text (or <pre> for code blocks)
```

**`mediaType` computed:**
```js
const mediaType = computed(() => {
  const t = props.message.type;
  if (t && t !== "text") return t;          // Phase 3 messages
  if (message.attachments?.length) ...       // legacy fallback
  return "text";
});
```

### `MessageBubble.vue`

Wraps `MessageContent` and adds:
- **Bubble styling**: green for own messages, white for others
- **Tail SVG**: the little triangle pointing to the sender
- **Sender name** (group chats only, first in cluster only)
- **Reply-to quote**: shows the replied-to message content above
- **Time + tick state**: clock (sending), single tick (sent), double gray (delivered), double blue (read)
- **Reaction bar**: groups identical emojis with counts

**Tick state logic:**
```
message.status:
  (no status / "sending") → clock icon (optimistic)
  "sent"                  → Tick01Icon gray
  "delivered"             → TickDouble02Icon gray
  "read"                  → TickDouble02Icon blue
```

### `MessageRow.vue`

The outermost row wrapper for each message. Adds:
- **Context menu** (right-click): reply, copy, edit, delete, star
- **Quick emoji picker**: 6 common emojis shown on hover
- **Sender avatar**: shown for first message in cluster from others

### `MessageComposer.vue`

The message input at the bottom. Handles:
1. **Text input** with typing indicators (`socket.emit("typing", roomId)`)
2. **Reply-to banner**: shows quoted message when `chatStore.replyingTo` is set
3. **File attachment** button → triggers hidden `<input type="file">`
4. **Media upload flow** (on file selected):
   - POST `/uploads/presign` → get `{ uploadUrl, key, mediaUrl }`
   - PUT `uploadUrl` → direct S3 upload (shows progress)
   - POST `/uploads/confirm` → verify upload
   - `chatStore.sendMessage({ mediaKey: key, mediaUrl, mediaMimeType, mediaSize })`
5. **Submit**: `chatStore.sendMessage({ content: text })`

---

## Service Factories

All service files export a factory function that takes `apiFetch` as a parameter. This pattern:
- Allows the same service to be used with different `apiFetch` instances (testing, different auth contexts)
- Avoids circular imports (services don't import stores)
- Makes services pure functions — no side effects, just API calls

```js
export function createChatService(apiFetch) {
  return {
    fetchConversations() { return apiFetch("/chats"); },
    sendMessage(body) { return apiFetch("/messages", { method: "POST", body }); },
    requestPresignedUrl(body) { return apiFetch("/uploads/presign", { method: "POST", body }); },
    confirmUpload(key) { return apiFetch("/uploads/confirm", { method: "POST", body: { key } }); },
    // ...
  };
}
```

**Usage in components/stores:**
```js
const { apiFetch } = useApiFetch();
const chatService = createChatService(apiFetch);
const result = await chatService.fetchConversations();
```

---

## Full Data Flow: Sending a Text Message

```
User types "Hello" and presses Enter
  │
  ▼
MessageComposer.vue → submit()
  │  chatStore.sendMessage({ content: "Hello" })
  │
  ▼
chat.store.js → sendMessage()
  │  Build optimisticMsg = { _id: "temp-123", content: "Hello", type: "text", status: "sending", _optimistic: true }
  │  messages.value = [...messages.value, optimisticMsg]  ← UI updates immediately
  │  socket.emit("send_message", { roomId, content: "Hello" })
  │
  ▼
WebSocket → Backend chat.socket.js → "send_message" handler
  │  await sendMessageService({ senderId, chatId, content: "Hello" })
  │    → insertMessage() → MongoDB: creates Message document
  │    → updateConversationLatestMessage()
  │    → incrementUnreadForOthers()
  │    → fire-and-forget: push notification to offline users
  │  io.to(roomId).emit("receive_message", message)
  │  io.to(senderId).emit("message_status_update", { messageId, status: "sent" })
  │
  ▼
WebSocket → Frontend chat.store.js → "receive_message" handler
  │  Find optimistic message by: _optimistic && content === "Hello" && same conversation
  │  Replace it with DB-confirmed message (has real _id, timestamps, etc.)
  │  messages.value = updatedMessages  ← UI updates (message now shows single tick)
  │
  ▼
"message_status_update" handler
  │  _patchMessage(messageId, m => ({ ...m, status: "sent" }))
  └── Single tick (gray) shown
```

---

## Full Data Flow: Sending a Media Message

```
User picks an image file
  │
  ▼
MessageComposer.vue → handleFileSelected(e)
  │
  │  1. POST /api/v1/uploads/presign  { mimetype: "image/jpeg", size: 36552 }
  │     ← { uploadUrl: "http://localhost:9000/vami-media/uploads/image/.../abc.jpg?X-Amz-Signature=...",
  │          key: "uploads/image/userId/abc.jpg",
  │          mediaUrl: "http://localhost:9000/vami-media/uploads/image/userId/abc.jpg",
  │          mediaType: "image" }
  │
  │  2. PUT uploadUrl  (direct browser → MinIO, backend not involved)
  │     ← 200 OK from MinIO
  │
  │  3. POST /api/v1/uploads/confirm  { key }
  │     Backend: HeadObjectCommand → verifies file exists in S3
  │     ← { exists: true, contentType: "image/jpeg" }
  │
  │  4. chatStore.sendMessage({
  │       content: null,
  │       mediaKey: "uploads/image/userId/abc.jpg",
  │       mediaUrl: "http://localhost:9000/vami-media/...",
  │       mediaMimeType: "image/jpeg",
  │       mediaSize: 36552,
  │     })
  │
  ▼
chat.store.js → sendMessage()
  │  msgType = "image"  (inferred from "image/jpeg".startsWith("image/"))
  │  optimisticMsg = { type: "image", mediaUrl: "...", mediaKey: "...", _optimistic: true }
  │  messages.value = [...messages.value, optimisticMsg]
  │  socket.emit("send_message", { roomId, type: "image", mediaKey, mediaUrl, mediaMimeType, mediaSize })
  │
  ▼
Backend → saves Message with type: "image", mediaKey, mediaUrl
Backend → io.to(roomId).emit("receive_message", message)
  │
  ▼
Frontend → replaces optimistic with DB-confirmed message
MessageContent.vue → mediaType === "image" → renders <img :src="mediaUrl">
```

---

## Auto-Import System

Nuxt auto-imports the following without explicit `import` statements:

| Auto-imported | Source |
|---|---|
| `useChatStore()` | `app/components/modules/chat/stores/chat.store.js` |
| `useStatusStore()` | `app/components/modules/chat/stores/status.store.js` |
| `useSocket()` | `app/components/modules/chat/composables/useSocket.js` |
| `usePanelManager()` | `app/components/modules/chat/composables/usePanelManager.js` |
| `usePushNotifications()` | `app/components/modules/chat/composables/usePushNotifications.js` |
| `useAuthStore()` | standard Pinia auto-import via `@pinia/nuxt` |
| `useApiFetch()` | `app/composables/useApiFetch.js` |
| `navigateTo()` | Nuxt built-in |
| `definePageMeta()` | Nuxt built-in |
| `useRuntimeConfig()` | Nuxt built-in |
| `ref, computed, ...` | Vue 3 built-ins via Nuxt |

This is configured in `nuxt.config.ts`:
```ts
imports: {
  dirs: [
    "components/modules/chat/composables",
    "components/modules/chat/stores",
  ],
}
```

---

## Pages

### `pages/index.vue`
Simple redirect to `/chat`. Protected by `auth` middleware — unauthenticated users get redirected to `/login` first.

### `pages/login.vue`
Uses `auth` layout. `guest` middleware redirects already-authenticated users to `/chat`. Renders `<LoginForm />`.

### `pages/register.vue`
Mirror of login. Renders `<RegisterForm />`.

### `pages/chat.vue`
The main application page. Key responsibilities:

1. **Socket initialization**: `chatStore.initializeSocket(authStore.token)` — one-time call on mount
2. **Status socket wiring**: registers `contact_status_updated`, `contact_status_deleted`, `status_viewed` events directly on the socket (these are status module events, not chat module events)
3. **Push notifications**: `initPush()` — subscribes browser to Web Push
4. **Panel setup**: `openPanel("left", MainChatList)` — shows the conversation list by default
5. **Load conversations**: initial data fetch
6. **Cleanup on unmount**: removes socket listeners, disconnects, unregisters push

**Template uses `ChatLayout` with named slots:**
```html
<template #sidebar>  <PanelContainer side="left" />  </template>
<template #chat>     <ChatWindow /> (+ toggle info button)  </template>
<template #info>     <PanelContainer side="right" />  </template>
```

### `pages/profile.vue`
Protected by `auth` middleware. Renders `<ProfileForm />` for updating username, email, avatar, bio.

---

## UI Atom Components

### `Button.vue`
Props: `variant` (primary/secondary/ghost/danger), `size` (sm/md/lg), `loading`, `disabled`.

### `Input.vue`
Props: `modelValue`, `type`, `placeholder`, `error` (shows red border + error message), `label`.

### `Avatar.vue`
Props: `src` (image URL), `name` (fallback initials), `size`, `online` (green dot indicator).

### `Alert.vue`
Props: `type` (info/success/warning/error), `message`. Auto-dismissible.

### `Tooltip.vue`
Props: `text`, `position`. Uses CSS positioning relative to the trigger element.

---

## Web Push Notifications (`usePushNotifications.js`)

**Initialization flow:**
1. Check `"Notification" in window` — not all browsers support push
2. Request permission: `Notification.requestPermission()`
3. Get service worker registration
4. Call `pushManager.subscribe({ applicationServerKey: vapidPublicKey })`
5. POST `/api/v1/push/subscribe` with the subscription object
6. Server stores in `PushSubscription` collection

**When a message arrives for an offline user:**
1. Backend `message.service.js` fires `push.service.js` (fire-and-forget)
2. `web-push` library sends notification to the browser via the Push API
3. The browser's service worker (managed by the browser, not Vami) shows the notification
4. User clicks notification → browser opens the app URL

---

## Error Handling Pattern

```
Service call fails (network error, 4xx, 5xx)
  │
  ▼
useApiFetch.js catches error
  │  401? Not a retry? Not auth endpoint?
  │    → try refreshAccessToken()
  │      success → retry once
  │      fail → navigateTo("/login")
  │  Other error → re-throw
  │
  ▼
Store action catches error
  │  error.value = err?.data?.message || "Default message"
  │  return false (if boolean return expected)
  │
  ▼
Component displays error
  │  v-if="authStore.error" → <Alert type="error" :message="authStore.error" />
```

All errors from the backend come in the shape:
```json
{ "statusCode": 400, "success": false, "message": "Human readable", "data": null, "errors": [] }
```
accessed in the frontend as `err?.data?.message`.
