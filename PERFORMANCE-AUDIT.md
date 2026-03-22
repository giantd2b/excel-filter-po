# IRIS CRM — Web Performance Audit

> Audited: 2026-03-23

---

## Fixed Issues

### 1. Route Code Splitting + Vite Chunking — FIXED

- **File:** `router.tsx`, `vite.config.ts`
- **Problem:** All 14 pages statically imported into a single 1,044 KB bundle.
- **Fix:** All 16 pages now lazy-loaded with `React.lazy()` + `<Suspense>`. Vite `manualChunks` splits vendor (231 KB), firebase (167 KB), and socket.io (41 KB) into cacheable chunks. Each page loads on-demand (3-79 KB each).
- **Result:** Initial load reduced from 1,044 KB to ~17 KB shell + on-demand chunks.

### 2. ChannelsSidebar — 1000-User Fetch Eliminated — FIXED

- **File:** `ChannelsSidebar.tsx`
- **Problem:** `getInboxStats()` downloaded 1000 user records to count unreads. This was triggered on every WebSocket event.
- **Fix:** Rewrote to use `useUnreadSocket()` hook which receives real-time unread counts via WebSocket. Combined with static channel names from `LINE_CHANNELS`/`FB_CHANNELS`. Zero REST calls for sidebar stats.

### 3. `window.location.reload()` Replaced — FIXED

- **File:** `ChatList.tsx`
- **Problem:** Pin toggle and bulk mark-read triggered full page reload, destroying WebSocket connections and all state.
- **Fix:** Optimistic local state updates via `setConversations()`. Pin toggle flips `isPinned` locally. Bulk mark-read clears all `unreadCount` to 0 locally.

### 4. WebSocket Listener Leaks — FIXED

- **File:** `useWebSocket.ts`
- **Problem:** `connect`/`disconnect` listeners never cleaned up (accumulated on re-runs). Async cleanup in `useMessagesSocket`/`useUnreadSocket` caused race conditions. `fetchInitial` called twice on mount + connect. `filter` missing from deps.
- **Fix:** All 3 hooks rewritten with: named handler functions + proper `socket.off()` cleanup, `socketRef` for synchronous cleanup, `cancelled` flag to prevent stale state updates, `initialFetchedRef` to prevent double fetch, `filter` added to dependency array.

### 5. React.memo + formatTime Extracted — FIXED

- **File:** `ChatListItem.tsx`, `MessageBubble.tsx`
- **Problem:** 100 ChatListItems and 200 MessageBubbles re-rendered on every WebSocket event. `formatTime` recreated inside component body on every render.
- **Fix:** `ChatListItem`, `MessageBubble`, and `DateDivider` wrapped in `React.memo`. `formatTime` and `formatDate` extracted to module-level functions.

### 6. Firestore SDK Removed — FIXED

- **File:** `firebase.ts`, `useFirestoreListener.ts`, `hooks/index.ts`
- **Problem:** Firestore SDK imported but never used for reads (WebSocket migration was complete). Dead `useFirestoreListener.ts` still existed with 3 unused hooks.
- **Fix:** Removed `firebase/firestore` import from `firebase.ts`. Deleted `useFirestoreListener.ts`. Cleaned dead re-exports from `hooks/index.ts`. Firebase chunk: 274 KB → 167 KB (39% smaller).

### 7. Avatar Lazy Loading — FIXED

- **File:** `ChatListItem.tsx`
- **Problem:** 100 avatar images loaded eagerly regardless of viewport position.
- **Fix:** Added `loading="lazy"` to avatar `<img>` tags.

### 8. AudioContext Leak — FIXED

- **File:** `useGlobalNotifications.ts`
- **Problem:** New `AudioContext` created on every notification. Browser limit is 6 concurrent contexts.
- **Fix:** Single shared `AudioContext` at module scope, reused across all notifications. Handles `suspended` state from browser autoplay policy.

### 9. Message Pagination — FIXED

- **File:** `useWebSocket.ts`, `ConversationArea.tsx`
- **Problem:** Always fetched 200 messages with no pagination. Large payload for every conversation.
- **Fix:** Initial fetch reduced to 50 messages. "โหลดข้อความเก่า" (Load older messages) button at top of message list. Uses `?before=timestamp` cursor pagination. Scroll position preserved when loading older messages via `scrollHeight` diff calculation. `hasMore` flag tracks if more messages exist.

### 10. ChatList Virtualization — FIXED

- **File:** `ChatList.tsx`
- **Problem:** All 100 conversation items rendered as DOM nodes simultaneously, even though only ~5-8 are visible on screen.
- **Fix:** Added `@tanstack/react-virtual` to virtualize the conversation list. Only ~10 DOM nodes exist at a time (visible items + overscan buffer of 10). As user scrolls, items are recycled — old ones removed, new ones created. Flattened list model handles pinned header, pinned items, divider, and unpinned items as a single virtual list. Estimated item sizes: header 28px, divider 2px, conversation item 76px.

**How virtualization works:**
```
Before: 100 DOM nodes always in memory
├── Item 1-5    ← visible on screen
└── Item 6-100  ← hidden but still in DOM, consuming memory

After: ~10 DOM nodes, recycled on scroll
├── Item 3-4    ← buffer above viewport
├── Item 5-8    ← visible on screen
└── Item 9-10   ← buffer below viewport
Items 1-2 and 11-100 don't exist in the DOM.
```

---

## Bundle Size Progress

| Metric | Before | After Round 1 | After Round 2 |
|---|---|---|---|
| **Total initial JS** | 1,044 KB (single chunk) | Split into chunks | Split into chunks |
| **Firebase chunk** | (in single bundle) | 274 KB | 167 KB |
| **Vendor chunk** | (in single bundle) | 231 KB | 231 KB |
| **Socket.io chunk** | (in single bundle) | 41 KB | 41 KB |
| **App shell** | (in single bundle) | 17 KB | 17 KB |
| **Inbox page** | (in single bundle) | 78 KB | 97 KB (+virtualization lib) |
| **Login page** | (in single bundle) | 3.4 KB | 3.4 KB |
| **Messages per load** | 200 | 200 | 50 (with pagination) |
| **ChatList DOM nodes** | 100 | 100 | ~10 (virtualized) |

---

## Remaining Issues (Not Yet Fixed)

### Medium Impact

| # | Issue | File | Status |
|---|---|---|---|
| 12 | `getAllTags()` refetched on every conversation click | `CustomerInfoPanel.tsx:87` | Open |
| 13 | No `AbortController` — stale requests can't be cancelled | `api-client.ts` | Open |
| 15 | AnalyticsPage fires 4 API calls per date change, no debounce | `AnalyticsPage.tsx:128` | Open |
| 16 | QuickReplies refetches templates on every open | `QuickReplies.tsx:16` | Open |
| 22 | Full array sort on every WS message | `useWebSocket.ts` | Open |
| 23 | Search input re-focused on every WS event | `ChatList.tsx:74` | Open |
| 24 | `UsersPage` stale closure — `lastId` wrong after search | `UsersPage.tsx:18` | Open |

### Low Impact

| # | Issue | File | Status |
|---|---|---|---|
| 25 | `maxMsgs` recomputed inside `.map()` loop | `DashboardPage.tsx:186` | Open |
| 26 | Double scroll animation on new messages | `ConversationArea.tsx:60, 117` | Open |
| 27 | Duplicate `markAsRead` calls on user select | `ConversationArea.tsx:38-76` | Open |
| 28 | Message images lack `width`/`height` (CLS) | `MessageBubble.tsx:96` | Open |
| 29 | Inline `fontFamily` style duplicated across layouts | `InboxPage.tsx:61`, `DashboardLayout.tsx:41` | Open |

---

## Recommended Next Fixes

1. **Cache tags + templates** (#12, #16) — reduces redundant API calls on every interaction
2. **Add AbortController** (#13) — prevents stale request race conditions
3. **Debounce AnalyticsPage** (#15) — stops request storms on date input
4. **Remaining low items** (#22-29) — polish and correctness
