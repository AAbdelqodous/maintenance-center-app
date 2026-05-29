# Implementation Plan: Quote Requests Inbox & Bidding (Owner)

**Branch**: `024-quote-requests-inbox` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/024-quote-requests-inbox/spec.md`

---

## Summary

Give centers a **lead inbox** for the customer reverse-marketplace: matching customer requests (right
category, in the service area, opted in) arrive; a permitted user responds with a **quote** (fixed price
or range, duration, inclusions, optional message); accepted quotes convert to bookings; not-selected/
expired close. Plus **lead preferences** (opt-in, categories, areas, quiet hours), **per-request chat**,
**lead metrics** (received/responded/won/win-rate/avg response time), and **Attention panel** integration.

This is the **owner side** of customer `009-get-quotes-marketplace`; both read/write the **same** backend
`quoterequest` domain — the customer authors/broadcasts/accepts, centers receive and respond, and
**responses are sealed** (no center sees another's quote). It recombines existing pieces: covered
categories (`004`/`014`), service area (`003`), the quote object (`009-work-progress-quotes`),
permissions (`011`), chat, and the Attention panel (`016`).

**Scope spans two repos**: `[Frontend]` = `maintenance-center-app/`, `[Backend]` = the shared
`quoterequest` package + matching/notification. The new permission `RESPOND_TO_QUOTES` and the new
Attention category `NEW_QUOTE_REQUEST` integrate with existing center systems.

**Frontend — files to add (8)**: `types/quoteRequests.ts`, `store/api/quoteRequestsApi.ts`,
`app/(app)/(tabs)/quote-requests/_layout.tsx`, `.../quote-requests/index.tsx` (inbox),
`.../quote-requests/[id].tsx` (request + respond), `.../quote-requests/preferences.tsx`,
`components/quoteRequests/InboxItem.tsx`, `components/quoteRequests/QuoteResponseForm.tsx`.
**Frontend — files to modify (6)**: `types/staff.ts` (`RESPOND_TO_QUOTES`), `types/attention.ts`
(`NEW_QUOTE_REQUEST`), `store/index.ts`, `app/(app)/(tabs)/profile/index.tsx` (entry),
`lib/i18n/locales/en.json`, `ar.json`.

---

## Technical Context

**Language/Version**: TypeScript (RN 0.81.5, Expo SDK 54) — frontend; Java 17, Spring Boot 3.5.6 — backend
**Primary Dependencies**: RTK Query + Redux Toolkit; Spring Data JPA + Hibernate; Expo Router; existing `chatApi`, `pricingApi` (`014` suggested price), `staffApi` (permissions), `notificationsApi`
**Storage**: PostgreSQL 15 (shared `quote_request` + `quote_response` tables + `lead_preferences`); RTK Query cache
**Testing**: `tsc --noEmit` (frontend); Spring Boot test slice + matching-rule unit tests (backend)
**Target Platform**: iOS, Android, Web (react-native-web)
**Project Type**: Mobile app (frontend) + REST API extension (backend)
**Performance Goals**: Matching request reaches an opted-in inbox within seconds (SC-001); quote submit < 60s with pre-filled price (SC-002); inbox list < 300ms p95
**Constraints**: Bilingual + RTL; KD 3 decimals (reuse `lib/utils/pricing.ts → formatKD`); center-scoped via JWT + `activeCenterId`; respond gated by `RESPOND_TO_QUOTES`; **one quote per center per request** (shared/edited, not duplicated); **sealed responses** (never expose competitors)
**Scale/Scope**: Tens of open leads per active center; responses commonly < 10 per request; quiet-hours-aware notifications

---

## Constitution Check

*Gate: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven | ✅ Pass | spec.md approved before plan |
| II. Bilingual First | ✅ Pass | Inbox, request detail, quote form, preferences via i18n; KD via shared formatter; RTL on all new screens |
| III. Component-Driven UI | ✅ Pass | InboxItem, QuoteResponseForm, plus reuse of center/rating components |
| IV. API Contract Adherence | ✅ Pass | RTK Query; JWT; `BusinessErrorCode`; no hardcoded URLs |
| V. Owner-Context Awareness | ✅ Pass | Leads/quotes/preferences/metrics center-scoped (`centers/my/...`); respond gated by `RESPOND_TO_QUOTES`; per-branch `activeCenterId` |
| VI. Security & Privacy | ✅ Pass | JWT in SecureStore; **sealed responses** — the center is given only its own quote, never competitors'; attachments view-only |
| VII. Production Readiness | ✅ Pass | No feature flags; error boundaries on new screens; quiet hours prevent notification abuse |

No violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/024-quote-requests-inbox/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── quote-requests-inbox-api.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source code

```text
# ── Frontend (maintenance-center-app/) ──
types/
├── quoteRequests.ts                  NEW — inbox item, request, response, preferences, metrics
├── staff.ts                          MODIFIED — add 'RESPOND_TO_QUOTES'
└── attention.ts                      MODIFIED — add 'NEW_QUOTE_REQUEST'
store/api/
└── quoteRequestsApi.ts               NEW — inbox, request detail, submit/edit/withdraw quote, preferences, metrics
store/index.ts                        MODIFIED — register quoteRequestsApi
app/(app)/(tabs)/quote-requests/      NEW (nested stack; href:null — reached from profile/attention, not a tab)
├── _layout.tsx
├── index.tsx                         inbox list
├── [id].tsx                          request detail + QuoteResponseForm
└── preferences.tsx                   opt-in + categories + areas + quiet hours
components/quoteRequests/
├── InboxItem.tsx                     NEW — category, desc, area+distance, thumbs, window, responded-state
└── QuoteResponseForm.tsx             NEW — price/range, duration, inclusions, message (pre-fill from 014)
app/(app)/(tabs)/profile/index.tsx    MODIFIED — "Quote Requests" entry (gated)
lib/i18n/locales/{en,ar}.json         MODIFIED — quoteRequests.* keys

# ── Backend (service-center/src/main/java/com/maintainance/service_center/) ──
quoterequest/                         NEW (shared with customer 009)
├── QuoteRequest.java, QuoteRequestStatus.java
├── QuoteResponse.java, QuoteResponseStatus.java
├── LeadPreferences.java
├── QuoteRequestController.java (center reads + respond), QuoteRequestService.java
├── matching/  (category + service-area + opt-in + active → match set; reach count)
└── (accept → booking handled where 009's accept lives; this side gets the "won/lost" event)
```

**Structure Decision**: Inbox screens live under `app/(app)/(tabs)/quote-requests/` as a nested stack
with `href:null` (reached from a Profile entry + the Attention panel), **not** a new bottom tab. Quote
responses reuse the `BookingQuote` shape conventions from `009-work-progress-quotes`. Backend adds a
`quoterequest` package shared with customer `009`; the accept→booking transition is owned by `009`'s
accept endpoint, and this side consumes the resulting won/lost event.

---

## Phase 0: Research

> Full records in `research.md`. Summary:

- **R1 — Shared `quoterequest` domain** with customer `009`. Center reads matching requests + writes its
  own (sealed) response; the customer accepts.
- **R2 — Matching is server-side** (covered category + service area + opted-in + active). The center
  inbox is the server's match set for this center; no client-side matching.
- **R3 — One quote per center per request.** Staff share/edit a single response; never duplicate. Two
  staff opening the same request edit the same quote.
- **R4 — Sealed responses.** The center is given only its own quote; competitors' quotes/counts are
  never sent to the center (Principle VI).
- **R5 — Permissions.** Add `RESPOND_TO_QUOTES` (OWNER, BRANCH_MANAGER, RECEPTIONIST). Preferences
  (opt-in/areas) is an owner/manager setting (`EDIT_CENTER_PROFILE`).
- **R6 — Attention + notifications.** New matching requests surface as a new `NEW_QUOTE_REQUEST`
  Attention category and (per preferences + quiet hours) a push notification.
- **R7 — Pre-fill from `014` pricing.** When the service has configured pricing, the quote form
  pre-fills a suggested price (editable).
- **R8 — Won/lost is event-driven.** Acceptance happens on the customer side (`009`); the center
  receives a "won" (booking created, enters the normal pipeline) or "not selected" event and updates
  metrics; expiry counts against response rate, not win rate.

---

## Phase 1: Design & Contracts

### Data model (`data-model.md`)

Frontend types in `types/quoteRequests.ts` — `InboxItem`, `QuoteRequestDetail`, `QuoteResponse`,
`QuoteResponseStatus`, `SubmitQuoteRequest`, `LeadPreferences`, `LeadMetrics`. Backend entities —
`QuoteRequest`, `QuoteResponse`, `LeadPreferences`. Full tables + transitions in `data-model.md`.

### Contracts (`contracts/quote-requests-inbox-api.md`)

Center endpoints (all `Authorization: Bearer <jwt>`, center-scoped):

| Method & Path | Consumer | Permission |
|---|---|---|
| `GET /centers/my/quote-requests` | inbox | `RESPOND_TO_QUOTES` (or view) |
| `GET /quote-requests/{id}` (center view) | request detail | `RESPOND_TO_QUOTES` |
| `POST /quote-requests/{id}/quote` | submit/edit our quote | `RESPOND_TO_QUOTES` |
| `DELETE /quote-requests/{id}/quote` | withdraw our quote | `RESPOND_TO_QUOTES` |
| `POST /quote-requests/{id}/chat` | request-scoped chat | `MANAGE_CHAT` |
| `GET|PUT /centers/my/lead-preferences` | preferences | `EDIT_CENTER_PROFILE` |
| `GET /centers/my/lead-metrics?from&to` | metrics | `VIEW_REPORTS` |

> The center never receives other centers' responses. Won/lost arrives via notification + request state.

### RTK Query slice

`store/api/quoteRequestsApi.ts` (tagTypes `['Lead','LeadList','LeadPreferences','LeadMetrics']`), inline
`fetchBaseQuery` + Bearer. `submitQuote`/`withdrawQuote` invalidate `Lead`+`LeadList`; preferences/metrics
their own tags.

### Permissions & Attention

`types/staff.ts`: add `'RESPOND_TO_QUOTES'` to `CenterPermission` + grant to OWNER, BRANCH_MANAGER,
RECEPTIONIST. `types/attention.ts`: add `'NEW_QUOTE_REQUEST'` to `AttentionCategory` and to
`ATTENTION_CATEGORY_ORDER`.

### Agent context update

```powershell
.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude
```

---

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|-----------|--------------------------------------|
| New backend `quoterequest` package (shared) | The marketplace needs a request + sealed responses + matching | A field on Booking can't model a pre-booking, multi-center negotiation |
| New `RESPOND_TO_QUOTES` permission | Bidding is a distinct capability from managing bookings | Reusing `MANAGE_BOOKINGS` would wrongly let receptionists-without-quoting bid, or block valid quoters |
| One-quote-per-center invariant | Avoids duplicate/contradictory bids from one center | Per-staff quotes would confuse the customer with multiple offers from one shop |
