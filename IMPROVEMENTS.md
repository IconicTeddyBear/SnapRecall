# SnapRecall — Recommended Improvements

## 1. Data Integrity & Reliability

### 1.1 localStorage is fragile and size-limited
**Files:** `src/utils/storageManager.ts`

All user data (cards, decks, review logs) is stored in `localStorage`, which has a ~5-10 MB limit depending on the browser and provides no protection against corruption. A user with many cards (especially those using base64-encoded images) can silently hit this limit. Additionally, `JSON.parse` is called without `try/catch`, so corrupted data will crash the app on load.

**Recommendations:**
- Wrap all `JSON.parse` calls in `try/catch` with fallback to empty arrays.
- Add a storage quota check before writing, and surface a warning when usage exceeds 80%.
- Consider migrating to IndexedDB (via a library like `idb`) for larger capacity and structured data.
- Store images as Blob URLs or in IndexedDB rather than inlining base64 strings in card objects.

### 1.2 Review logs grow unboundedly
**Files:** `src/utils/storageManager.ts`, `src/App.tsx:171-173`

Every card review appends a new `ReviewLog` entry that is never pruned. Over months of use, this array will grow into the thousands and contribute to localStorage pressure and slower serialization.

**Recommendation:** Implement log rotation — aggregate logs older than 90 days into daily summary records and discard the individual entries.

### 1.3 No data migration/versioning strategy
**Files:** `src/utils/storageManager.ts`

There is no schema version stored alongside the data. If the `Card` or `Deck` interface changes in a future release, existing users' persisted data will silently break or lose fields.

**Recommendation:** Store a `schemaVersion` number in localStorage and write migration functions that run on load when the version is outdated.

---

## 2. Code Quality & Architecture

### 2.1 Duplicated deck-creation logic (3 copies)
**Files:** `src/App.tsx:50-67`, `src/App.tsx:229-253`, `src/App.tsx:289-313`

The logic to auto-create smart decks from tags is copy-pasted in three places: the initial `useEffect`, `handleImportCards`, and `handleSaveCard`. Any bug fix or behavior change needs to be applied in all three locations.

**Recommendation:** Extract into a single `syncDecksFromTags(cards, decks)` utility function and call it from all three sites.

### 2.2 Duplicated CSV parsing logic (2 copies)
**Files:** `src/utils/csvUtils.ts:17-77`, `src/views/DashboardView.tsx:57-80`

The `DashboardView` contains its own inline CSV parser that duplicates the one already in `csvUtils.ts`. The two implementations have slightly different behaviors (e.g., tag delimiter is `;` in one and `,` in the other).

**Recommendation:** Remove the inline parser in `DashboardView` and use `csvUtils.parseCSV` exclusively.

### 2.3 Monolithic App.tsx with excessive prop drilling
**Files:** `src/App.tsx`

`App.tsx` owns all state (cards, decks, logs, view, study queue, etc.) and passes ~10 callbacks per child component. This makes the component hard to maintain and increases coupling.

**Recommendations:**
- Introduce React Context (e.g., `CardContext`, `StudyContext`) to provide shared state without deep prop chains.
- Move handler logic into custom hooks (e.g., `useCards`, `useStudySession`, `useDecks`) to separate concerns from rendering.

### 2.4 Loose typing in storageManager
**Files:** `src/utils/storageManager.ts:22-28`

`getLogs` returns `any[]` and `saveLogs` accepts `any[]`, losing the type safety that the `ReviewLog` interface provides.

**Recommendation:** Change to `ReviewLog[]` for both functions.

### 2.5 `any` types scattered in handlers
**Files:** `src/views/DashboardView.tsx:86`, `src/views/StudyView.tsx:26`

`DashboardView` uses `const card: any = {}` during CSV import, and `StudyView` types a timer as `any`. These undermine TypeScript's value.

**Recommendation:** Replace with proper types (`Partial<Card>`, `ReturnType<typeof setTimeout>`).

---

## 3. Performance

### 3.1 Expensive filtering on every render
**Files:** `src/views/DecksView.tsx:57`, `src/views/DashboardView.tsx:115-123`

`DecksView` calls `cards.filter(c => c.nextReviewDate <= Date.now())` on every render outside of `useMemo`. `DashboardView` similarly re-derives `deckMasteryData` without memoization.

**Recommendation:** Wrap these computations in `useMemo` with appropriate dependency arrays.

### 3.2 Analytics retention data ignores category filter
**Files:** `src/views/AnalyticsView.tsx:57`

The `retentionData` memo depends on `[logs]` but should depend on `[activeLogs]`. When the user selects a category filter, retention data doesn't update.

**Recommendation:** Change the dependency to `[activeLogs]`.

### 3.3 No virtualization for large card lists
**Files:** `src/views/DecksView.tsx:171-231`

If a category contains hundreds of cards, all are rendered into the DOM at once. This will cause jank as the dataset grows.

**Recommendation:** Use a virtualized list (e.g., `@tanstack/react-virtual` or `react-window`) for the card list.

### 3.4 Base64 images stored inline inflate state
**Files:** `src/views/EditorView.tsx:30-36`

Images uploaded via the editor are stored as full base64 data URIs directly in the card object. This means every `setCards(...)` call copies potentially megabytes of image data.

**Recommendation:** Store images separately (IndexedDB blobs or external URLs) and reference them by ID in the card object.

---

## 4. Bug Risks

### 4.1 Study session operates on stale snapshot
**Files:** `src/App.tsx:105-107`, `src/views/StudyView.tsx`

`studyQueue` is a snapshot taken when the user enters the study view. Grading a card updates `cards` state but does *not* update `studyQueue`, so if a user navigates back to a previously-graded card in the same session, they see the pre-graded version.

**Recommendation:** Either derive the study queue from `cards` reactively, or update `studyQueue` in `handleGradeCard`.

### 4.2 Undo only tracks the last deleted card
**Files:** `src/App.tsx:176-198`

`lastDeletedCard` stores only one entry. If a user deletes two cards in rapid succession (from the DecksView list), the first deletion is unrecoverable.

**Recommendation:** Use a deletion history stack instead of a single entry.

### 4.3 `getSmartStartDeck` may return the "All Cards" deck as null
**Files:** `src/utils/deckUtils.ts:36-53`

The "All Cards" default deck has `tags: []`, so `deckCards` for it is always empty (since `deck.tags.some(...)` returns false for an empty array). This means the default deck is never recommended by Smart Start. If there are only untagged cards, Smart Start returns the first deck's ID, which may also have 0 due cards.

**Recommendation:** Special-case the default deck or ensure untagged cards are always reachable.

### 4.4 Streak calculation has off-by-one potential
**Files:** `src/utils/deckUtils.ts:101-141`

`daysArray` is derived from a `Set` which does not guarantee insertion order. The code assumes `daysArray[0]` is the most recent day, but `Set` iteration order for date-string keys is not necessarily descending.

**Recommendation:** Explicitly sort `daysArray` in descending date order before checking.

---

## 5. Security

### 5.1 Unsanitized HTML rendering of card content
**Files:** `src/components/Flashcard.tsx:46`, `src/views/DecksView.tsx:178`

Card text is rendered as plain text via `{front}` and `{back}`, which is safe from XSS. However, imported card data from JSON/CSV is not validated before being stored — a malicious JSON file could include unexpected fields or very large strings that degrade UX.

**Recommendation:** Validate and sanitize imported data — enforce max string lengths, strip non-printable characters, and only allow known fields.

### 5.2 No Content Security Policy
**Files:** `index.html`

The app loads an external texture image (`transparenttextures.com`) in `DashboardView.tsx:201` without a CSP. This is a potential vector for tracking or resource replacement.

**Recommendation:** Either bundle the texture locally or add a strict Content Security Policy header.

### 5.3 `@google/genai`, `express`, `better-sqlite3` are unused
**Files:** `package.json`

These dependencies are declared but never imported in any source file. They increase the install footprint and attack surface unnecessarily.

**Recommendation:** Remove unused dependencies.

---

## 6. Testing

### 6.1 Zero test coverage
The project has no tests at all. The SRS algorithm, CSV parser, deck utilities, and streak calculator are all pure functions that are straightforward to unit test and are critical to correctness.

**Recommendations (priority order):**
1. Add a test framework (Vitest integrates naturally with Vite).
2. Unit test `srsAlgorithm.ts` — verify interval progression, easiness floor, difficulty score mapping.
3. Unit test `csvUtils.ts` — round-trip generate/parse, edge cases (quotes, empty fields, unicode).
4. Unit test `deckUtils.ts` — due card filtering, mastery calculation, streak edge cases.
5. Add component tests for `Flashcard` flip behavior and `EditorView` form validation.

---

## 7. UX & Accessibility

### 7.1 `alert()` and `window.confirm()` for user communication
**Files:** `src/App.tsx:153`, `src/views/DashboardView.tsx:104,107`, `src/views/DecksView.tsx:217`

Native browser dialogs block the main thread, cannot be styled, and are jarring in a polished SPA.

**Recommendation:** Replace with in-app toast notifications and confirmation modals (the StudyView already has a custom delete confirmation — generalize it).

### 7.2 No keyboard shortcuts for study sessions
**Files:** `src/views/StudyView.tsx`

Users must click to flip cards and click grade buttons. Power users studying hundreds of cards would benefit from keyboard shortcuts (e.g., Space to flip, 1/2/3 to grade).

**Recommendation:** Add `useEffect` keyboard event listeners in `StudyView` for common actions.

### 7.3 No loading or error states
No component handles loading or error states. If localStorage is empty on first launch, or if an import fails partway through, the user gets either a blank screen or a cryptic `alert()`.

**Recommendation:** Add empty states, loading skeletons, and error boundaries.

### 7.4 Navigation header hidden during study sessions
**Files:** `src/App.tsx:448-480`

The nav header (Dashboard/Decks/Analytics) is always visible, even during study sessions. This can be distracting and encourages accidental navigation away from an active session.

**Recommendation:** Hide or minimize the nav bar when `currentView === 'study'`.

---

## 8. Developer Experience

### 8.1 No ESLint or Prettier configuration
The only lint command is `tsc --noEmit`, which only checks type errors. There is no enforcement of code style, import ordering, or common React anti-patterns.

**Recommendation:** Add ESLint with `eslint-plugin-react-hooks` and Prettier for consistent formatting.

### 8.2 No CI/CD pipeline
There are no GitHub Actions workflows. Regressions can be merged without any automated checks.

**Recommendation:** Add a basic CI workflow that runs `tsc --noEmit` and tests on every push/PR.

### 8.3 package.json name is misleading
**Files:** `package.json:2`

The package is named `"react-example"` but the app is "Elite Flashcards" / "SnapRecall".

**Recommendation:** Update the name to `"snap-recall"` or `"elite-flashcards"`.

---

## Summary — Priority Ranking

| Priority | Area | Impact |
|----------|------|--------|
| **P0** | Fix stale study queue bug (#4.1) | Users see wrong data during study |
| **P0** | Add try/catch to storage reads (#1.1) | App crashes on corrupted data |
| **P0** | Fix analytics dependency bug (#3.2) | Category filter doesn't work |
| **P1** | Extract duplicated deck-sync logic (#2.1) | Maintenance hazard |
| **P1** | Remove duplicate CSV parser (#2.2) | Inconsistent import behavior |
| **P1** | Add unit tests for core utils (#6.1) | No safety net for regressions |
| **P1** | Fix streak Set ordering (#4.4) | Streak may report wrong value |
| **P2** | Replace alert/confirm with modals (#7.1) | Poor UX |
| **P2** | Add keyboard shortcuts (#7.2) | Study efficiency |
| **P2** | Introduce React Context (#2.3) | Maintainability |
| **P2** | Remove unused dependencies (#5.3) | Smaller footprint |
| **P3** | Migrate to IndexedDB (#1.1) | Scalability |
| **P3** | Add CI/CD (#8.2) | Developer workflow |
| **P3** | Add ESLint + Prettier (#8.1) | Code consistency |
