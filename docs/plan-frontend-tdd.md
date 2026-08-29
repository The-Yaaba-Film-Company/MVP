# Frontend TDD Implementation Plan — Screenplay Editor MVP

**Date:** 2026-08-28
**Approach:** Contract-first TDD. The FastAPI backend does not exist yet, so MSW handlers instantiate the API contract from `SPEC.md` §7. Every story goes red → green against those handlers; the real backend later only needs to satisfy the same contract (disable MSW in prod). Tests assert **both** the UI outcome and the cache/network effect on every story.
**Inputs:** `SPEC.md` (backend contract + §8 frontend wiring), `docs/Screenplay Editor — Frontend Technical Specification.md` (editor behavior, schema, shortcuts, pagination).

## Decisions (confirmed)

1. **Scope** — Full MVP in phased epics (all four views). Phase 1 = Epics 0–2 (test infra, API contract, auth).
2. **UI layer** — Adobe Spectrum for interaction chrome (per SPEC §8); Tailwind v4 remains for layout/metrics styling.
3. **Test stack** — Vitest + React Testing Library + MSW. Playwright E2E deferred to Epic 9 (hardening).
4. **API contract** — MSW contract-first: a typed API client + `src/api/mocks/` handlers mirror SPEC §7. The frontend defines the contract (types + Tiptap JSON shape) that FastAPI must honor.
5. **Autosave conflict policy** — on a PATCH 409 (or 5xx): toast, discard local, reload server scene, no duplicate in-flight saves.
6. **Per-scene documents** — each `scenes.content` is a Tiptap fragment of screenplay elements **without** a wrapping Scene node; scene identity/number/locked live on the scene DB row (the frontend spec's multi-scene root Document maps to the screenplay, not a single content blob). Contract detail — FastAPI must store/return this exact fragment shape.
7. **Node IDs** — block nodes carry a stable `id` attribute assigned by a ProseMirror plugin on creation; `annotations` reference `scene_id + node_id + start/end offset` (SPEC.md §4.3). Copy/paste mints new ids (MVP: annotations are not preserved across copy).

## Pipeline (Definition of Done per phase)

```
npm run test   # vitest run — all green
npm run lint   # eslint (TanStack config)
npm run build  # vite build incl. tsc/typecheck
npm run generate-routes  # after any route file add/move/rename
```

## Epic list (MoSCoW)

| #   | Epic                                | Priority             | Key deliverables                                                                                                    |
| --- | ----------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 0   | Foundations & test infra            | Must                 | vitest/RTL/MSW/Query/Zustand/Spectrum/Tiptap installed; `renderWithProviders`, `src/api/mocks` skeletons, MSW smoke |
| 1   | API client & domain contract        | Must                 | SPEC §7 types, typed client methods, CSRF helper (SPEC §3.2), error shaping (401/403/network)                       |
| 2   | Auth & session                      | Must                 | login/register/logout, `/auth/me` hydration, route guard redirect                                                   |
| 3   | Project & screenplay shell          | Must                 | projects list/create, screenplays list/create, 4-view base route                                                    |
| 4   | Writer view (editor core)           | Must                 | Tiptap schema, scene CRUD/reorder, 800ms debounced one-scene autosave + optimistic patch + reconcile                |
| 5   | Scene / Breakdown / Navigator views | Must (Scene: Should) | context panel, outline navigator, TanStack Table reports with client sort/filter                                    |
| 6   | Pagination layout engine            | Should               | pure layout algorithm (Page[], SceneMetrics[]) in Web Worker, summary POST                                          |
| 7   | Semantic layer                      | Must                 | text tagging (DialogTrigger/Menu/ComboBox → POST annotation), AI suggest/accept/reject decorations                  |
| 8   | Validation, search, locking display | Should/Could         | validation panel, project search, locked numbering display                                                          |
| 9   | Hardening                           | Could                | coverage gate (≥80 on api + features) ✓, Playwright smoke ✓, a11y axe smoke (WCAG A/AA) ✓                           |

### Status

- **Done:** Epics 0–6. Epic 4 complete — scene reorder (SPEC §31 ▲/▼ with `order_key`, scene IDs immutable), smart Enter (§22), slash menu (§24), `Ctrl/Cmd+1..8` element switch (§21), `Ctrl/Cmd+Shift+N` new scene (§29). Epic 5 complete — Scene view (read-only pager, active-scene store), Navigator (outline rows with page ranges, lock status, sort/filter), Breakdown (set report with client sort/filter). **Epic 6 complete** — pure client-side pagination engine (`geometry.ts` + `layout.ts`) run in a Web Worker (in-process jsdom fallback), Signature-computed in `usePaginationReport`: optimistic cache update via `['screenplay', id, 'pagination']` then debounced CSRF-signed `PATCH /reports/pagination` (default 400ms, `setPaginationPublishDebounceMs(0)` test seam); server summary is a non-authoritative cache overwritten on every change. 73 tests / 14 files green; `typecheck`, `lint`, `prettier --check` (touched files), and `build` clean.
- **Epic 7 complete (semantic layer).** Tagging — `Ctrl/Cmd+Shift+T` captures the selection as a single-textblock span (`selectionToSpan` → `{node_id,start_offset,end_offset}`), TagMenu picks the entity type, EntityPicker is a ComboBox over `GET /projects/{id}/entities?type=&q=` with a create-new row (`POST /projects/{id}/entities`), and POSTing the annotation carries `X-CSRF-Token`. AI review — "Analyze Scene" (`POST /scenes/{id}/ai-suggest`) lists pending suggestions with Accept/Reject (`POST /ai-suggestions/{id}/accept|reject`); accept persists a solid `ai_accepted` annotation and invalidates `['scene',id,'annotations']` + the entity report. Character autocomplete — focused/converted Character nodes (NodeSelection support) offer `type=character` matches or "create character", binding `characterId`/`displayName` back onto the node. **Text ≠ Formatting ≠ Entity (SPEC §59):** annotations/suggestions render purely as `Decoration.inline` overlays (`semantic-annotation` solid, `semantic-suggestion` dashed) from a per-scene span registry fed by React Query; the plugin never touches the doc (uncovered by `offset`/`decorations` unit tests + flow assertions that scene textContent is unchanged). Contract extended with `CreateEntityRequest` + `api.entities.create`. MSW handlers are stateful for accept/reject (flip status; accept pushes `ai_accepted`). Flow tests drive real ProseMirror selections via a native DOM Range + PM's `selectionchange` observer (jsdom cannot emulate mouse-drag or Home/End keys, which are absent from prosemirror-commands' base keymap). 101 tests / 19 files green; `typecheck`, `lint`, and `build` clean.
- **Next:** Epic 8 (validation/search/locking display), then 9 (hardening).
- **Epic 8 complete (validation + project search; locking display was already done).** Locking display was already shipped in Epics 4–6 (SceneView locked badge, ScreenplaysPage "Locked"/"Draft", SceneEditor read-only `locked-badge` + `writer-flow` locked test). Validation — a scene-scoped `ValidationPanel` (`src/features/validation/`, key `['scene',id,'validation']`) reads `GET /scenes/{id}/validation` and lists issues grouped by error/warning/info with colored dots; clicking one reuses `findNodeRange` to select/scroll the affected node in the read-only Scene editor. Search — a `SearchPanel` (`src/features/search/`) in the screenplay layout nav queries `GET /projects/{id}/search?q=&types=` (key `['projects',id,'search',{q,types}]`, enabled only when `q` is non-empty), shows kind-badged matches, and a result click sets the active scene + navigates to the Scene view. Contract tests cover validation GET and search query serialization (q present, types joined, types omitted when empty); flow tests cover panel issue rendering + goto, and search → navigate-to-scene + empty state. Locked-numbering display already covered. 107 tests / 20 files green; `typecheck`, `lint`, and `build` clean.
- **Hardening: `writer-flow` slash-test de-flaked.** The two slash/click tests targeted `getByText('John enters the room.')`, which races with the semantic decoration overlay (it wraps "John" in a `semantic-annotation` span, so the unsplit literal is no longer a direct text-node child and RTL's string matcher fails once the async annotation resolves). Switched both click targets to the proven `editor.querySelector('[data-node-type="action"]')` pattern from the semantic flow tests; verified stable across repeated isolated runs and the full suite.
- **Epic 9 complete (coverage gate + Playwright smoke + a11y axe smoke).** Coverage gate — added `@vitest/coverage-v8` and a `coverage` block in `vitest.config.ts` (`include: ['src/api/**','src/features/**']`, skipping tests/types/mocks; thresholds lines 80 / statements 80 / functions 80 / branches 75). Gate passes at the aggregate (Stmts 90, Branches 79, Funcs 93, Lines 92) with zero new tests needed; `npm run test:coverage` enforces it (opt-in, not on fast `npm test`). Playwright E2E — added `@playwright/test`, `playwright.config.ts` (`testDir: e2e`, `channel: 'chrome'` to reuse system Chrome 152, `webServer: npm run dev:mock` with `reuseExistingServer: true`), and `e2e/smoke.spec.ts` (boots signed-in → projects → screenplays → writer editor editable; scene view read-only + validation panel). A11y axe smoke — `@axe-core/playwright`, with `e2e/a11y.spec.ts` running `AxeBuilder.withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])` against the projects/screenplays/writer/scene pages and asserting zero violations (all scan clean with no in-app fixes needed); scan runs post-hydration so axe sees the live DOM. Because there is no FastAPI, E2E must boot `dev:mock` (the browser MSW worker only activates under `VITE_API_MOCK=1`), never `build`/`preview` where MSW is stripped. `npm run test:e2e` green (2 smoke + 4 a11y). `.gitignore` gained `test-results`/`playwright-report`.

## Editor schema (contract, from frontend spec §5–14, §61)

- Root `doc` content: `(sceneHeading | action | character | dialogue | parenthetical | transition | shot | general)*` (Shot per §61 optional; deferred unless camera_setup work needs it).
- `sceneHeading` attrs: `{ intExt: "INT"|"EXT"|"INT/EXT"|"I/E", location, timeOfDay, modifier? }` — display `INT. POLICE STATION - NIGHT`.
- `character` attrs: `{ characterId, displayName, extension? }`.
- `action`, `dialogue`, `parenthetical`, `shot`, `general`: `{ id }`.
- `transition`: `{ transitionType? }` (right-aligned).
- All block nodes carry stable `id` (decision 7) except sceneHeading (location drives the scene row) and transition.
- No marks persist semantic tags — tags are `Decoration.inline` overlays read from Query caches only (Text ≠ Formatting ≠ Semantic Entity; §59).

## Editor behaviors (frontend spec §21–31, §42)

- Shortcuts `Ctrl/Cmd + 1..8` → element switch; `Ctrl/Cmd + Shift + T` tagging menu; `Ctrl/Cmd + Shift + N` new scene.
- Smart Enter: sceneHeading→Action, Character→Dialogue, Dialogue→Action, Parenthetical→Dialogue, Transition→SceneHeading/Action.
- Slash command menu (`/` filters by element name).
- Character autocomplete: `ComboBox` over `GET /projects/{id}/entities?type=character&q=`.
- Scene Navigator lists scenes (`01 INT. HOUSE - DAY` + character metadata), click scrolls editor; reorder via drag/move handlers hitting `POST /scenes/{id}/reorder`.
- Page count/runtime, scene page ranges from the pagination engine (§35–38): US Letter, Courier 12pt, 1.5" left / 1" right/top/bottom, element-specific widths (`ElementLayout` geometry table); 1 page ≈ 1 minute.

## Test conventions

- Co-located `*.test.tsx`; `src/test/setup.ts` registers jest-dom, RTL cleanup, MSW lifecycle.
- `renderWithProviders(ui, { client, router, store })` = fresh QueryClient + MemoryRouter + Zustand initial state.
- `src/api/mocks/` fixture factory (`buildScene`, `buildEntity`, …) + per-resource `handlers.ts`; `server.use()` for 401/409/network edges.
- Architectural tests (fail if violated):
  - scene Tiptap JSON is never mutated by decorations/annotations;
  - autosave fires ≤1 PATCH per 800ms window;
  - every mutating API call attaches `X-CSRF-Token`;
  - no `supabase-js` / anon key anywhere in `src/`.

## Mocked dev server (`npm run dev:mock`)

- Runs the Vite dev server with `VITE_API_MOCK=1`; `src/client.tsx` awaits `startMockApi()` (`src/api/mocks/browser.ts`, `setupWorker` + the shared `handlers`) **before** hydrating, so no real network ever fires.
- Only `/api/*` requests are intercepted (others pass through silently); the app boots already signed in because `GET /auth/me` returns the seeded user.
- Mutations work without a live backend, but send **no** `X-CSRF-Token` — the mocks don't set/validate that cookie (parity is exercised in the test suite instead).
- `public/mockServiceWorker.js` is generated by `npx msw init public/ --save` and committed. The worker runs only in the browser; SSR/test setups are unaffected.

## Phases

1. **Epics 0 + 1 + 2** — test infra, contract, auth (done).
2. **Epics 3 + 4** — shell + Writer/autosave (done).
3. **Epics 5 + 6** — remaining views + pagination (done).
4. **Epics 7 + 8** — semantic layer (done); validation/search/locking (done).
5. **Epic 9** — hardening/E2E (coverage gate + Playwright smoke + a11y axe smoke done).

## Non-functional requirements (testable)

- Autosave ≤1 PATCH per 800ms; typing never blocked by flush.
- All mutating requests carry `X-CSRF-Token`; GETs stay side-effect-free.
- `strict` + `verbatimModuleSyntax` clean; `lint` + `build` green at every DoD.
- No Supabase creds/`supabase-js` in `src/`.
