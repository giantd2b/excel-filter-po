# IRIS CRM — Web Performance Audit

> Audited: 2026-03-23

---

## Critical Issues

### 1. No Route Code Splitting — Single 1MB Bundle

- **File:** `router.tsx`
- **Problem:** All 14 pages are statically imported. Every user downloads the entire app on first load.
- **Fix:** Convert to `React.lazy(() => import(...))` with `<Suspense>` fallback.

### 2. `getInboxStats()` Fetches 1000 Users Client-Side

- **File:** `api-service.ts:147`
- **Problem:** Downloads up to 1000 user records just to count unreads per channel. Should be a server-side aggregation endpoint.
- **Fix:** Create a dedicated `/inbox/stats` endpoint that returns aggregated counts. (Note: `useUnreadSocket` already uses `/inbox/stats` — migrate `ChannelsSidebar` to use it too.)

### 3. ChannelsSidebar Fires Expensive REST on Every WebSocket Event

- **File:** `ChannelsSidebar.tsx:66-70`
- **Problem:** Every incoming message triggers `getInboxStats()` (the 1000-user fetch). In a busy inbox this is a continuous stream of heavy requests.
- **Fix:** Use the WebSocket event payload directly for unread counts instead of making a REST round-trip.

### 4. `window.location.reload()` Used as State Management

- **File:** `ChatList.tsx:139, 206`
- **Problem:** Pin toggle and bulk mark-read do a full page reload, destroying WebSocket connections and all React state.
- **Fix:** Optimistically update local state after the API call succeeds.

### 5. WebSocket Listener Leak — `connect`/`disconnect` Never Cleaned Up

- **File:** `useWebSocket.ts:150-153`
- **Problem:** Only `conversation:updated` is removed in cleanup. `connect` and `disconnect` listeners accumulate on every re-run, causing `fetchInitial` to fire N times per reconnect.
- **Fix:** Store the socket ref and remove all listeners (`connect`, `disconnect`, `conversation:updated`) in the cleanup function.

### 6. Async Cleanup in `useMessagesSocket`

- **File:** `useWebSocket.ts:256-261`
- **Problem:** Cleanup uses `getSocket().then(...)` which is async. React ignores async cleanup, causing race conditions where new subscriptions get immediately unregistered.
- **Fix:** Store the socket instance in a ref during the effect and use it synchronously in cleanup.

---

## High Impact

| # | Issue | File |
|---|---|---|
| 7 | **No `React.memo` on ChatListItem** — 100 items re-render on every WS event | `ChatListItem.tsx:15` |
| 8 | **No `React.memo` on MessageBubble** — 200 messages re-render on every new message | `MessageBubble.tsx:13` |
| 9 | **Always fetches 200 messages**, no pagination or caching | `useWebSocket.ts:188` |
| 10 | **No Vite `manualChunks`** — Firebase + socket.io not split for caching | `vite.config.ts` |
| 11 | **`fetchInitial()` called twice** on page load (mount + socket connect) | `useWebSocket.ts:78, 91` |
| 12 | **`getAllTags()` refetched on every conversation click** | `CustomerInfoPanel.tsx:87` |
| 13 | **No `AbortController`** anywhere — stale requests can't be cancelled | `api-client.ts` |

### Details

- **#7 & #8:** Wrap `ChatListItem` and `MessageBubble` in `React.memo`. Extract `formatTime` outside the component body so it doesn't get recreated on every render.
- **#9:** Fetch an initial batch of 50 messages. Add "scroll up to load more" for older messages. Cache previously loaded conversations in memory.
- **#10:** Add `build.rollupOptions.output.manualChunks` to `vite.config.ts`:
  ```js
  manualChunks: {
    firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
    socketio: ['socket.io-client'],
    vendor: ['react', 'react-dom', 'react-router-dom'],
  }
  ```
- **#11:** Guard the `connect` handler to skip `fetchInitial` if data is already loaded, or deduplicate with a flag.
- **#12:** Cache `getAllTags()` result in a React context or module-level variable. Tags rarely change.
- **#13:** Pass `AbortSignal` to `fetch()` in `api-client.ts`. Create an `AbortController` in each `useEffect` and abort in cleanup.

---

## Medium Impact

| # | Issue | File |
|---|---|---|
| 14 | **`filter` missing from useEffect deps** — socket subscription stale on filter change | `useWebSocket.ts:153` |
| 15 | **AnalyticsPage fires 4 API calls per date change**, no debounce | `AnalyticsPage.tsx:128` |
| 16 | **QuickReplies refetches templates on every open** | `QuickReplies.tsx:16` |
| 17 | **`html2canvas` in production deps**, appears unused | `package.json` |
| 18 | **Firestore SDK imported** but not used for reads | `firebase.ts:3` |
| 19 | **`formatTime` redefined inside component** on every render | `ChatListItem.tsx:16`, `MessageBubble.tsx:19` |
| 20 | **New `AudioContext` per notification** — hits browser 6-context limit | `useGlobalNotifications.ts:72` |
| 21 | **No `loading="lazy"` on avatars** — 100 images loaded eagerly | `ChatListItem.tsx:57` |
| 22 | **Full array sort on every WS message** | `useWebSocket.ts:140` |
| 23 | **Search input re-focused on every WS event** | `ChatList.tsx:74` |
| 24 | **`UsersPage` stale closure** — `lastId` wrong after search | `UsersPage.tsx:18` |

### Details

- **#14:** Add `filter` to the dependency array of `useConversationsSocket`'s `useEffect`.
- **#15:** Debounce date input changes (300ms) before triggering API calls.
- **#16:** Cache templates in module scope or React context. Only refetch on explicit user action.
- **#17:** Remove `html2canvas` from `package.json` if unused.
- **#18:** Remove Firestore import from `firebase.ts` if not needed in the frontend.
- **#19:** Move `formatTime` to a shared utility file or define it outside the component.
- **#20:** Create a single `AudioContext` instance at module scope and reuse it.
- **#21:** Add `loading="lazy"` to avatar `<img>` tags in `ChatListItem`.
- **#22:** Use insertion sort (move updated item to correct position) instead of full `.sort()` on every WS event.
- **#23:** Remove or guard the `useEffect` that re-focuses the search input on `rawConversations` change.
- **#24:** Pass `lastId` as a parameter to `fetchUsers` instead of capturing it via closure.

---

## Low Impact

| # | Issue | File |
|---|---|---|
| 25 | `maxMsgs` recomputed inside `.map()` loop | `DashboardPage.tsx:186` |
| 26 | Double scroll animation on new messages | `ConversationArea.tsx:60, 117` |
| 27 | Duplicate `markAsRead` calls on user select | `ConversationArea.tsx:38-76` |
| 28 | Message images lack `width`/`height` (CLS) | `MessageBubble.tsx:96` |
| 29 | Inline `fontFamily` style duplicated across layouts | `InboxPage.tsx:61`, `DashboardLayout.tsx:41` |

### Details

- **#25:** Compute `maxMsgs` once before the `.map()` loop.
- **#26:** Remove one of the two scroll effects — keep only the `useEffect` on `messages.length`.
- **#27:** Deduplicate `markAsRead` — call it only in the `useEffect` on user change, not also in `handleNewMessage`.
- **#28:** Add `width` and `height` attributes (or aspect-ratio CSS) to message images to prevent layout shift.
- **#29:** Add the font stack to `tailwind.config.cjs` under `theme.extend.fontFamily` and use a utility class.

---

## Recommended Fix Order

Ordered by impact-to-effort ratio:

1. **Route lazy loading + Vite chunking** (#1, #10) — cuts initial bundle dramatically
2. **WebSocket listener fixes** (#5, #6, #11, #14) — stops memory leaks and duplicate fetches
3. **React.memo + extract formatTime** (#7, #8, #19) — stops unnecessary re-renders
4. **Replace `window.location.reload()`** (#4) — keeps state alive on pin/read actions
5. **ChannelsSidebar → use `/inbox/stats`** (#3) — eliminates the 1000-user fetch
6. **Add AbortController to useEffects** (#13) — prevents stale request race conditions
7. **Remove unused deps** (#17, #18) — quick wins for bundle size
8. **Message pagination** (#9) — reduces payload and DOM nodes
9. **Cache tags + templates** (#12, #16) — reduces redundant API calls
10. **Remaining medium/low items** (#14-29) — polish and correctness
