# Feature Specification: Quote Requests Inbox & Bidding (Owner)

**Feature Branch:** `024-quote-requests-inbox`
**Status:** Draft
**Created:** 2026-05-29
**Phase:** specify (next: plan → tasks → implement)
**Input:** Owner-side counterpart to the customer "Get Quotes" marketplace — a lead inbox where centers see broadcast customer requests matching their categories and area, respond with a competitive quote (price/range, duration, inclusions, message), and convert accepted quotes into bookings.

> **Spec Kit reminder:** This describes WHAT and WHY. Tables, endpoints, matching/notification implementation belong in `plan.md`.

---

## Dependencies (read before this spec)

- **Pairs with** customer `specs/009-get-quotes-marketplace` — same objects from the supply side; the customer broadcasts and accepts, the center receives and quotes.
- **Requires** `specs/004-service-catalog` + `specs/014-owner-services-pricing` — the center's covered categories/services and pricing inform which requests it matches and what to quote.
- **Requires** `specs/003-center-profile` — the service area/governorates a center covers determines matching.
- **Requires** `specs/011-center-staff-permissions` — a `RESPOND_TO_QUOTES` permission controls who may quote on behalf of the center.
- **Relates to** `specs/009-work-progress-quotes` (the quote object & versioning), `specs/016-attention-required-panel` (new requests surface as attention items), and `specs/023-payments-earnings-payouts` (an accepted quote becomes a payable, settleable booking).

---

## 1. Summary

The customer marketplace (`009`) lets a customer broadcast a problem to multiple centers. This spec is
the **center's inbox and response tool** for those broadcasts. It is, in effect, a **free qualified-lead
channel** — the strongest acquisition and engagement hook for owners on the platform.

The center can:

1. **Opt in** to receive quote requests and declare the categories + service area it wants leads for.
2. See an **inbox** of matching requests (problem description, category, customer area, photos/video,
   distance) with state and freshness.
3. **Respond with a quote** — fixed price or range, estimated duration, what's included, optional
   message — and edit or withdraw it while the request is open.
4. **Win or lose**: accepted quotes convert to a booking automatically; not-selected quotes are marked
   so the center sees its hit rate.
5. **Chat** with the customer to clarify before they decide.

---

## 2. Why Now

- "Free leads land in your inbox; quote and win the job" is the single most compelling reason for a
  center owner to install, return to, and keep notifications on for the app — it directly grows their revenue.
- It is the supply side of `009`; without it the customer marketplace has nobody to respond, so the two
  ship together.
- It reuses the quote object (`009-work-progress-quotes`), pricing (`014`), profile/area (`003`), and
  permissions (`011`) the center app already has — mostly a recombination into a lead workflow.
- Competing centers responding to the same request is exactly the market pressure that delivers the
  customer-side price transparency the platform's strategy is built on.

---

## 3. Scope

### In scope

- **Opt-in + lead preferences**: toggle receiving quote requests; choose which covered categories and
  which governorates/areas to receive; set quiet hours for lead notifications.
- **Inbox**: list of matching open requests with category, short description, customer area + distance,
  attachment thumbnails, time received, response window remaining, and whether this center has already responded.
- **Request detail**: full description, all attachments, category/service, preferred fulfillment-mode hint.
- **Respond / quote**: submit a fixed price or a range, estimated duration, inclusions/what's covered,
  optional message; pre-fill suggested price from `014` pricing where available.
- **Edit / withdraw** an open quote before the customer accepts.
- **Outcome handling**: on customer acceptance, the center is notified and a booking is created (carrying
  the request + quote); on not-selected/expired, the center is notified and the lead closes.
- **Per-request chat** with the customer (reuses chat infra).
- **Lead metrics**: requests received, responded, won, win rate, average response time — surfaced for the center.
- **Attention integration**: a new matching request appears in the `016` Attention Required panel.

### Out of scope (explicitly deferred)

- **The customer compose/compare/accept UX** — lives in `009-get-quotes-marketplace`.
- **Auto-quoting / rule-based auto-bid** ("auto-quote my list price on any AC request"). v1 is manual;
  auto-quote is a tempting follow-up but out of scope.
- **Seeing competitors' quotes or count.** A center never sees what others quoted (sealed responses).
- **Paid lead boosting** (pay to appear first / get more leads) — a monetization follow-up.
- **Structured counter-offer/negotiation protocol** beyond free-text chat.
- **Cross-branch lead pooling** — leads match per center; a multi-branch owner sees each branch's inbox
  under that branch's `activeCenterId`.

---

## 4. Glossary

| Term | Meaning in this spec |
|---|---|
| **Quote Request (lead)** | A customer broadcast (`009`) that matched this center and appears in its inbox. |
| **Match** | The request's category is covered by the center, the customer's area is in the center's service area, and the center is opted in. |
| **Quote (response)** | This center's reply: price/range, duration, inclusions, message. Sealed from other centers. |
| **Win rate** | Accepted quotes ÷ submitted quotes over a period. |
| **Response window** | The customer-set window during which the request stays open for quotes. |
| **Lead preferences** | The categories, areas, and notification settings governing which requests this center receives. |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive and Respond to a Matching Request (Priority: P1)

An opted-in center receives a new matching request, opens it, reviews the description and photos, and
submits a quote with price, duration, and what's included. The customer sees it on their request.

**Why this priority**: Receiving a lead and quoting it is the entire value of the feature; nothing else matters without it.

**Independent Test**: With a center opted into a category, have a customer broadcast a request in that category/area (`009`); verify the request appears in the center's inbox and a submitted quote becomes visible on the customer's request detail.

**Acceptance Scenarios**:

1. **Given** an opted-in center covering the request's category and area, **When** a customer broadcasts a matching request, **Then** it appears in the center's inbox and (per preferences) a notification is sent.
2. **Given** a request in the inbox, **When** the owner opens it, **Then** the full description, attachments, category/service, customer area + distance, and remaining window are shown.
3. **Given** an open request, **When** the owner submits a quote (price/range, duration, inclusions, optional message), **Then** the quote is recorded and made visible to the customer, and the inbox marks this center as "responded."
4. **Given** `014` pricing exists for the service, **When** the owner opens the quote form, **Then** a suggested price is pre-filled and editable.

---

### User Story 2 - Win a Quote → Booking Created (Priority: P1)

The customer accepts this center's quote; the center is notified and a confirmed booking is created
carrying the request details and the agreed price, ready for the normal work-progress flow.

**Why this priority**: Conversion to a booking is how the lead becomes revenue; it closes the loop with the rest of the app.

**Independent Test**: Accept the center's quote from the customer app; verify the center receives a "you won" notification and a booking appears in the center's bookings list pre-filled from the request + quote at the agreed price.

**Acceptance Scenarios**:

1. **Given** a submitted quote, **When** the customer accepts it, **Then** the center is notified and a confirmed booking is created carrying the request's category/service/description and the quoted price.
2. **Given** the center won, **When** the booking is created, **Then** it enters the standard booking pipeline (assignable/self-claim, work-progress, payment) like any other booking.
3. **Given** another center won the same request, **When** the outcome is decided, **Then** this center's quote is marked "not selected" and the center is notified, and the request leaves the active inbox.

---

### User Story 3 - Configure Lead Preferences & Opt In (Priority: P2)

The owner opts in to quote requests, selects which categories and governorates to receive leads for,
and sets quiet hours so lead alerts don't arrive overnight.

**Why this priority**: Controls relevance and notification fatigue; centers will disable the whole feature if they get irrelevant 3am alerts, but the core loop can be demoed with defaults.

**Acceptance Scenarios**:

1. **Given** the owner opens lead preferences, **When** they opt in and select categories + areas, **Then** only requests matching those are delivered.
2. **Given** quiet hours are set, **When** a matching request arrives during them, **Then** it appears in the inbox but no push notification fires until quiet hours end.
3. **Given** the owner opts out entirely, **When** new requests are broadcast, **Then** the center receives none.

---

### User Story 4 - Edit/Withdraw a Quote & See Win Rate (Priority: P3)

Before the customer decides, the owner lowers their quoted price; separately, the owner reviews their
lead metrics (received / responded / won / win rate / avg response time).

**Why this priority**: Improves competitiveness and gives owners feedback, but the loop works without it.

**Acceptance Scenarios**:

1. **Given** an open, unaccepted quote, **When** the owner edits the price/inclusions, **Then** the customer sees the updated quote and is notified of the change.
2. **Given** an open quote, **When** the owner withdraws it, **Then** it is removed from the customer's request and the inbox reflects "withdrawn."
3. **Given** historical activity, **When** the owner opens lead metrics, **Then** received, responded, won, win rate, and average response time are shown for a date range.

### Edge Cases

- Request expires before the center responds → it leaves the active inbox and counts against response rate, not win rate.
- Center's covered categories/area change after a request matched → an already-received request stays; future matching uses the new settings.
- Customer cancels the request after this center quoted → the center is notified and the quote closes.
- Two staff at the same center try to quote the same request → one quote per center; the second sees/edits the existing quote (no duplicate).
- Center is deactivated/suspended → stops matching new requests; open quotes are withdrawn.
- Attachment-heavy request on a slow connection → thumbnails load progressively; the owner can quote without all media loaded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A center MUST be able to opt in/out of quote requests and select the covered categories and service-area governorates for which it receives leads.
- **FR-002**: The system MUST deliver to a center only requests that match its covered categories, service area, and opt-in, and MUST never expose other centers' responses.
- **FR-003**: The inbox MUST show each matching open request with category, description, customer area + distance, attachment thumbnails, time received, remaining window, and this center's response state.
- **FR-004**: A permitted user (`RESPOND_TO_QUOTES`) MUST be able to submit a quote with a fixed price or range, estimated duration, inclusions, and optional message.
- **FR-005**: The quote form MUST pre-fill a suggested price from `014` pricing when available and allow override.
- **FR-006**: The center MUST be able to edit or withdraw its quote while the request is open, with the customer notified of changes.
- **FR-007**: On customer acceptance, the center MUST be notified and a confirmed booking MUST be created carrying the request and the agreed quote, entering the standard booking pipeline.
- **FR-008**: On not-selected or expired, the center MUST be notified and the lead MUST close (counting toward response/win metrics appropriately).
- **FR-009**: The center MUST be able to chat with the customer scoped to the request before a decision.
- **FR-010**: New matching requests MUST surface in the `016` Attention Required panel and (per preferences and quiet hours) trigger a push notification.
- **FR-011**: The system MUST enforce one quote per center per request, shared/edited by the center's staff rather than duplicated.
- **FR-012**: The center MUST be able to view lead metrics — received, responded, won, win rate, average response time — for a date range.
- **FR-013**: All prices MUST be KD (3 decimals) and bilingual (AR/EN); lead data is scoped to the active center for multi-branch owners.

### Key Entities

- **Lead Preferences** (per center): opt-in flag, covered categories, service-area governorates, quiet hours.
- **Inbox Item** (derived): the join of a matching Quote Request with this center's response state.
- **Quote (response)**: request reference, center, price/range, duration, inclusions, message, state (`SUBMITTED/UPDATED/WITHDRAWN/SELECTED/NOT_SELECTED`), submitted/updated timestamps.
- **Lead Metrics** (derived): counts and rates over a period per center.
- **Request Chat**: conversation scoped to (request, center, customer), reusing chat infra.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A matching request appears in an opted-in center's inbox within seconds of broadcast.
- **SC-002**: An owner can review a request and submit a quote in under 60 seconds with pre-filled pricing.
- **SC-003**: ≥ 60% of matching requests at active centers receive a response (response rate).
- **SC-004**: Quote requests become a meaningful lead source — ≥ 20% of bookings at active centers originate from won quotes within 6 months.
- **SC-005**: Centers can see their win rate, and the median time-to-first-response across the platform is under 30 minutes during business hours.
- **SC-006**: Zero leakage of one center's quote to another (sealed responses) in testing.

## Assumptions

- The customer marketplace `009` defines request broadcast, expiry window, and acceptance; this spec consumes those.
- Matching rule (covered category + service area + opted in + active) is sufficient for v1; smarter relevance ranking is a follow-up.
- Pricing suggestions come from `014-owner-services-pricing` where the service has configured pricing.
- An accepted quote's booking flows into the normal booking/work-progress/payment pipeline without special-casing beyond its origin tag.
- Multi-branch scoping follows the existing `activeCenterId` context.
