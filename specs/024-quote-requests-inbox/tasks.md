# Tasks: Quote Requests Inbox & Bidding (Owner)

**Feature**: 024-quote-requests-inbox
**Input**: Design documents from `specs/024-quote-requests-inbox/`
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, contracts/quote-requests-inbox-api.md ✓, research.md ✓, quickstart.md ✓

**Repos**: `[Frontend]` → `maintenance-center-app/`, `[Backend]` → `service-center/src/main/java/com/maintainance/service_center/`. The `quoterequest` package is **shared with customer `009-get-quotes-marketplace`** — extend if `009`'s backend tasks created it.

**Tests**: One targeted backend test — the matching rule + one-quote-per-center invariant (correctness-critical, R2/R3). No broad UI suite.

**Organization**: Tasks grouped by user story (US1–US4) for independent delivery. Setup + Foundational carry no Story label.

## Format: `[ID] [P?] [Repo] [Story] Description`

- **[P]**: Parallelizable · **[Story]**: [US1]…[US4] · exact paths included

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Frontend types, permission, Attention category, i18n, store registration. No backend dependency.

- [ ] T001 [Frontend] Create `types/quoteRequests.ts` — `QuoteRequestStatus`, `QuoteResponseStatus`, `InboxItem`, `QuoteRequestDetail`, `QuoteResponse`, `SubmitQuoteRequest`, `LeadPreferences`, `LeadMetrics`; copy verbatim from `data-model.md`.
- [ ] T002 [Frontend] Create `store/api/quoteRequestsApi.ts` — `createApi({ reducerPath:'quoteRequestsApi', tagTypes:['Lead','LeadList','LeadPreferences','LeadMetrics'], baseQuery: inline fetchBaseQuery + Bearer })`; endpoints `getInbox` (`centers/my/quote-requests`, providesTags `LeadList`), `getLead` (`quote-requests/${id}`, providesTags `[{type:'Lead',id}]`), `submitQuote` (`POST quote-requests/${id}/quote`, invalidates `Lead`+`LeadList`), `withdrawQuote` (`DELETE quote-requests/${id}/quote`, invalidates `Lead`+`LeadList`), `startRequestChat` (`POST quote-requests/${id}/chat`), `getLeadPreferences`/`updateLeadPreferences` (`centers/my/lead-preferences`, invalidates `LeadPreferences`), `getLeadMetrics` (`centers/my/lead-metrics`); export hooks. Mirror `contracts/…`.
- [ ] T003 [P] [Frontend] Modify `types/staff.ts` — add `'RESPOND_TO_QUOTES'` to `CenterPermission`; grant in `ROLE_PERMISSIONS` to `OWNER`, `BRANCH_MANAGER`, `RECEPTIONIST` (R5). Leave others unchanged.
- [ ] T004 [P] [Frontend] Modify `types/attention.ts` — add `'NEW_QUOTE_REQUEST'` to `AttentionCategory` and to `ATTENTION_CATEGORY_ORDER` (place near the top, before `LOW_RATED_REVIEW`) (R6).
- [ ] T005 [Frontend] Register `quoteRequestsApi` in `store/index.ts` (depends T002) — reducer map + middleware, matching the existing 17-slice pattern.
- [ ] T006 [P] [Frontend] Add `quoteRequests.*` keys to `lib/i18n/locales/en.json` per `contracts/…#i18n Key Set`.
- [ ] T007 [P] [Frontend] Add the mirrored Arabic keys to `lib/i18n/locales/ar.json` (KD via `formatKD`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend shared `quoterequest` entities, matching, and the won/lost event scaffold. If customer `009` created the package, **extend** it.

**⚠️ CRITICAL**: No US endpoint works until these exist.

- [ ] T008 [Backend] Create/extend `quoterequest/QuoteRequest.java` + `QuoteRequestStatus.java` — `customer`, `category`, `service` (nullable), `description`, `attachments`, `areaGovernorate`, `fulfillmentHint`, `status`, `expiresAt`, `acceptedResponse` (nullable), audit (per `data-model.md`).
- [ ] T009 [Backend] Create `quoterequest/QuoteResponse.java` + `QuoteResponseStatus.java` — `request`, `center`, `priceMin`/`priceMax` DECIMAL(10,3), `estimatedDurationMinutes`, `inclusions`, `message`, `status`, `submittedAt`, `updatedAt`, **unique `(request_id, center_id)`** (R3).
- [ ] T010 [P] [Backend] Create `quoterequest/LeadPreferences.java` — `@OneToOne center`, `optedIn`, `@ManyToMany categories`, `areaGovernorates`, `quietHoursStart/End`.
- [ ] T011 [Backend] Create `quoterequest/matching/` — given a broadcast request, compute the match set (covered category ∩ opted-in centers ∩ service-area governorate ∩ active) and a reach count (R2). Unit-testable pure rule.
- [ ] T012 [Backend] DB migration: `quote_request`, `quote_response` (with the unique constraint), `lead_preferences` (+ join tables) and indexes.
- [ ] T013 [Backend] Add `RESPOND_TO_QUOTES` to the backend permission enum + role mapping (mirror `types/staff.ts`) so endpoint authorization matches the frontend.
- [ ] T014 [Backend] Won/lost event scaffold: when `009`'s accept fires, emit `SELECTED` to the winning center (create booking via the normal pipeline) + `NOT_SELECTED` to the others; on expiry/cancel close leads (R8). Wire notifications + the `NEW_QUOTE_REQUEST` Attention feed.

**Checkpoint**: `tsc --noEmit` (FE) passes; backend compiles, tables exist, matching unit-tested. Build the frontend stub (per `quickstart.md`).

---

## Phase 3: User Story 1 — Receive & Respond to a Matching Request (Priority: P1) 🎯 MVP

**Goal**: An opted-in center sees a matching request and submits a quote the customer can see.

**Independent Test**: With the center opted in, a matching request (stub or customer `009`) appears in the inbox; a submitted quote becomes visible on the customer side.

- [ ] T015 [Backend] [US1] `GET /centers/my/quote-requests` (match set for this center, gated `RESPOND_TO_QUOTES`) + `GET /quote-requests/{id}` center view returning **only `myResponse`** (sealed, R4).
- [ ] T016 [Backend] [US1] `POST /quote-requests/{id}/quote` — **upsert** the center's single quote (unique per center, R3); pre-fill source is `014` pricing on the read side; reject if request not OPEN.
- [ ] T017 [P] [Frontend] [US1] Create `components/quoteRequests/InboxItem.tsx` — category, description preview, area + distance, attachment thumbs, received/expires window, `myResponseStatus` badge.
- [ ] T018 [P] [Frontend] [US1] Create `components/quoteRequests/QuoteResponseForm.tsx` — fixed-or-range price (`formatKD`, `priceMin ≤ priceMax`), duration, inclusions, message; pre-fill suggested price from `pricingApi` (`014`) when available (R7).
- [ ] T019 [Frontend] [US1] Create `app/(app)/(tabs)/quote-requests/_layout.tsx` (Stack) + `index.tsx` (inbox via `getInbox`, virtualized `InboxItem` list, empty/loading/error); gated `RESPOND_TO_QUOTES`.
- [ ] T020 [Frontend] [US1] Create `app/(app)/(tabs)/quote-requests/[id].tsx` — request detail (description, attachments view-only, area, fulfillment hint, countdown) + `QuoteResponseForm` → `submitQuote`; register routes in `app/(app)/(tabs)/_layout.tsx` with `href:null`.
- [ ] T021 [Frontend] [US1] Add a gated **"Quote Requests"** entry in `app/(app)/(tabs)/profile/index.tsx` and surface `NEW_QUOTE_REQUEST` items in the Attention panel (`016`) navigating to `quote-requests/[id]`.
- [ ] T022 [P] [test] [US1] Backend unit test: matching rule (category ∩ opt-in ∩ area ∩ active) and the **one-quote-per-center** invariant (re-submit updates, never duplicates) — R2/R3.

**Checkpoint US1**: Opted-in center receives leads and submits a quote. Shippable MVP.

---

## Phase 4: User Story 2 — Win a Quote → Booking Created (Priority: P1)

**Goal**: Customer accepts this center → "you won" + a booking in the normal pipeline.

**Independent Test**: Accept this center's quote from the customer app (or stub) → "won" notification + a booking appears, pre-filled from the request + quote.

- [ ] T023 [Backend] [US2] On `009` accept of this center: set `QuoteResponse.SELECTED`, create the booking (category/service/description + agreed price), enter the normal pipeline; set other responses `NOT_SELECTED`; notify all (depends T014).
- [ ] T024 [Frontend] [US2] Handle outcomes on `[id].tsx` + inbox: `SELECTED` → "won" banner + link to the created booking; `NOT_SELECTED` → "not selected", lead leaves the active inbox; refetch on the won/lost notification.

**Checkpoint US2**: Leads convert to bookings; US1+US2 = both P1 stories.

---

## Phase 5: User Story 3 — Lead Preferences & Opt-In (Priority: P2)

**Goal**: Owner opts in, selects categories/areas, sets quiet hours.

**Independent Test**: Opt in with categories/areas → only matching requests arrive; a matching request during quiet hours shows in the inbox but pushes no notification.

- [ ] T025 [Backend] [US3] `GET|PUT /centers/my/lead-preferences` (gated `EDIT_CENTER_PROFILE`); matching honors `optedIn` + categories + areas; notification dispatch honors quiet hours (R6).
- [ ] T026 [Frontend] [US3] Create `app/(app)/(tabs)/quote-requests/preferences.tsx` — opt-in switch, category multi-select (covered categories), area multi-select (governorates), quiet-hours pickers; wired to `getLeadPreferences`/`updateLeadPreferences`; gated `EDIT_CENTER_PROFILE`.

**Checkpoint US3**: Relevance + notification control in place.

---

## Phase 6: User Story 4 — Edit/Withdraw Quote & Win Rate (Priority: P3)

**Goal**: Lower the quote before acceptance; review lead metrics.

**Independent Test**: Edit an open quote (customer notified); withdraw it (removed from the request); view received/responded/won/win-rate/avg-response.

- [ ] T027 [Backend] [US4] `DELETE /quote-requests/{id}/quote` (withdraw; reject if already SELECTED) + `GET /centers/my/lead-metrics` (received/responded/won/winRate/avgResponseMinutes; expiry ≠ loss, R8), gated `VIEW_REPORTS`.
- [ ] T028 [Frontend] [US4] Extend `[id].tsx` — edit (re-submit) + withdraw actions on an open quote; add a metrics view (on inbox or preferences) using `getLeadMetrics`.

**Checkpoint US4**: Competitiveness + feedback loop complete.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T029 [P] [Frontend] RTL spot-check (Arabic): inbox rows, quote form (price placement), preferences, metrics, countdown.
- [ ] T030 [P] [Frontend] Permission audit — inbox/quote form hidden without `RESPOND_TO_QUOTES`; preferences read-only without `EDIT_CENTER_PROFILE`; metrics hidden without `VIEW_REPORTS`; TECHNICIAN sees none; OWNER/MANAGER/RECEPTIONIST quote.
- [ ] T031 [P] [Frontend] Multi-branch — switching `activeCenterId` swaps the inbox/metrics; no cross-branch pooling.
- [ ] T032 [Frontend] Request-scoped chat — wire "Message customer" → `startRequestChat` → existing chat thread; continues under the booking after win, read-only after expiry.
- [ ] T033 End-to-end smoke (stub or live + customer `009`): opt-in → matching lead arrives (inbox + Attention, quiet-hours respected) → quote (pre-filled) → win → booking; edit/withdraw; metrics; sealed (no competitor data). Prices via `formatKD`.

**Checkpoint Final**: All four stories pass; permissions + RTL + multi-branch + sealed-responses verified.

---

## Dependencies & Execution Order

- **Phase 1 Setup**: immediate. T001, T003, T004, T006, T007 parallel; **T002** then **T005 (after T002)**.
- **Phase 2 Foundation**: backend entities + matching + events; BLOCKS US endpoints. T008→T009; T010, T011 parallel; T012, T013, T014 follow.
- **US1**: T015, T016 (backend) → T017, T018 (components, parallel) → T019, T020 → T021; T022 test alongside.
- **US2**: needs US1 + T014 events. T023 (backend) → T024 (frontend).
- **US3**: independent of US1/US2 beyond Foundation.
- **US4**: after US1 (extends `[id].tsx`); metrics needs responded/won data.
- **Polish**: after US phases; T029–T031 parallel.

### Parallel opportunities

| Group | Tasks |
|-------|-------|
| Setup FE | T001, T003, T004, T006, T007 |
| Foundation BE | T010, T011 (after T008/T009) |
| US1 components | T017, T018 |
| Polish | T029, T030, T031 |

---

## Implementation Strategy

### MVP first (US1 + US2 — both P1)
Setup → Foundation (stub) → US1 (inbox + respond) → US2 (win → booking) → **validate** the
broadcast→quote→accept→booking loop with customer `009` → ship behind the same readiness gate as `009`.

### Incremental delivery
Foundation → US1 → US2 → US3 (preferences) → US4 (edit/withdraw + metrics) → Polish.

### Backend coordination
| Task group | Backend needed? |
|------------|-----------------|
| T001–T007 (Setup) | No — pure frontend, stubbable |
| T008–T014 (Foundation) | Yes — shared `quoterequest` package |
| US1–US4 frontend | Stub sufficient to build/test; live needs matching + events |
| T022, T033 | Matching/invariant = backend unit; e2e needs stub or live + customer `009` |

---

## Notes

- **Shared `quoterequest` domain** with customer `009` — one request, sealed per-center responses; do not fork.
- **Sealed responses (R4)**: the center is given only its own quote; never request/render competitor data.
- **One quote per center (R3)**: backend unique `(request, center)`; re-submit updates; T022 proves it.
- **Matching is server-side (R2)**: the inbox is the server's match set; no client-side filtering.
- **New permission only where needed (R5)**: `RESPOND_TO_QUOTES` for quoting; reuse `EDIT_CENTER_PROFILE`
  (preferences) and `VIEW_REPORTS` (metrics).
- **Attention + quiet hours (R6)**: `NEW_QUOTE_REQUEST` always lists in the panel; push suppressed in quiet hours.
- **Won ≠ via this app**: acceptance is customer-side (`009`); this side consumes won/lost events; expiry counts against response rate, not win rate (R8).
- **Money**: reuse `lib/utils/pricing.ts → formatKD`. Multi-branch via `activeCenterId`.
