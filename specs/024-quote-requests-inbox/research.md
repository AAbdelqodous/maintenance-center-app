# Research: Quote Requests Inbox & Bidding (Owner)

**Feature**: 024-quote-requests-inbox
**Date**: 2026-05-29

> Phase 0 decision records. Each is a standalone decision with rationale and rejected alternatives.

---

## R1 — Shared `quoterequest` domain with customer 009

**Decision**: 024 (owner) and `maintenance-customer-app/specs/009` (customer) operate on the **same**
backend `quoterequest`/`quote_response` records. The customer authors, broadcasts, and accepts; the
center receives matching requests and writes its **own** response. No parallel model.

**Rationale**: One request, one negotiation. The center's inbox is a view of the customer's broadcast;
forking the model would let the two apps disagree about what was asked or quoted.

**Alternatives considered**: A separate "lead" entity mirrored from the customer request — rejected:
two truths for one request; sync drift.

---

## R2 — Matching is server-side; the inbox is the server's match set

**Decision**: The center inbox returns exactly the requests the **backend** matched to this center
(covered category + service-area governorate + opted-in + active). The client performs **no** matching;
it renders what `GET /centers/my/quote-requests` returns.

**Rationale**: Matching rules (area coverage, opt-in, active) live server-side and evolve; duplicating
them in the client guarantees divergence and lets a misconfigured client show leads the center
shouldn't see.

**Alternatives considered**: Client filters a global request feed — rejected: leaks every customer
request to every center and reimplements matching.

---

## R3 — One quote per center per request

**Decision**: A center has at most **one** `QuoteResponse` per request, shared and edited by its staff.
Two staff opening the same request see/edit the same quote; submitting again **updates** rather than
creating a duplicate.

**Rationale**: Spec FR-011. A customer must see a single, coherent offer from a shop, not competing
bids from its own receptionist and technician. It also keeps "win rate" meaningful (one bid = one
outcome).

**Alternatives considered**: Per-staff quotes merged into a "best" — rejected: confusing to the
customer and to metrics; who owns the price?

---

## R4 — Sealed responses (no competitor visibility)

**Decision**: The center is given **only its own** quote and the request; it never receives other
centers' quotes, prices, or even the count of competitors. The backend enforces this; the client simply
never has competitor data.

**Rationale**: Spec out-of-scope + Principle VI. Sealed bidding protects every center's pricing and
prevents a race-to-the-bottom spectacle, while the customer still gets competition.

**Alternatives considered**: Show "you're the lowest/3rd of 5" hints — rejected by the spec; leaks
competitive info.

---

## R5 — Permissions: new `RESPOND_TO_QUOTES`, preferences via profile-edit

**Decision**: Add a new **`RESPOND_TO_QUOTES`** permission for viewing the inbox and submitting/editing/
withdrawing the center's quote; grant to **OWNER, BRANCH_MANAGER, RECEPTIONIST** (the front-of-house
roles that handle inbound work). **Lead preferences** (opt-in, categories, areas, quiet hours) are an
owner/manager setting gated by the existing **`EDIT_CENTER_PROFILE`**. Metrics use existing `VIEW_REPORTS`.

**Rationale**: Bidding is a distinct capability from `MANAGE_BOOKINGS`; a tightly-scoped permission lets
a center decide who quotes. Reusing `EDIT_CENTER_PROFILE` for preferences and `VIEW_REPORTS` for metrics
avoids new permissions where existing ones already express the intent.

**Alternatives considered**: Reuse `MANAGE_BOOKINGS` for quoting — rejected: conflates booking ops with
sales; a center may want receptionists to quote but not reassign technicians (or vice versa).

---

## R6 — Attention panel + quiet-hours notifications

**Decision**: A new matching request surfaces as a new `NEW_QUOTE_REQUEST` Attention category
(`types/attention.ts` + `ATTENTION_CATEGORY_ORDER`) and triggers a push notification **subject to the
center's quiet hours** in lead preferences. During quiet hours the lead still appears in the inbox /
Attention panel; only the push is suppressed until quiet hours end.

**Rationale**: Spec FR-010 + US3. The Attention panel (`016`) is the center's "what needs me now" hub;
leads belong there. Quiet hours prevent 3am alerts that would make owners disable the whole feature.

**Alternatives considered**: Always push immediately — rejected: notification fatigue kills opt-in;
quiet hours are explicitly requested.

---

## R7 — Pre-fill suggested price from `014` pricing

**Decision**: When the request's service (or category) has configured pricing in `014-owner-services-
pricing`, the `QuoteResponseForm` pre-fills a suggested price (range or midpoint), fully editable.

**Rationale**: Spec FR-005 + SC-002 (quote in < 60s). Most quotes are "my list price for this job";
pre-filling removes typing and speeds response, which lifts response rate.

**Alternatives considered**: Always blank form — rejected: slower, and ignores data the center already
maintains.

---

## R8 — Won/lost is event-driven; expiry ≠ loss

**Decision**: Acceptance happens on the **customer** side (`009`'s accept). The center receives a
**"won"** event (a confirmed booking is created and enters the normal pipeline — assignable/self-claim,
work-progress, payment) or a **"not selected"** event, and metrics update accordingly. **Expiry** (no
acceptance before the window) counts against **response rate** (if the center never responded) but not
**win rate**.

**Rationale**: Spec US2 + FR-008 + metrics. The center can't accept on the customer's behalf; it can
only be told the outcome. Separating expiry from "lost" keeps win rate honest (you can't lose a bid
nobody accepted).

**Alternatives considered**: Treat expiry as a loss — rejected: distorts win rate and unfairly
penalizes centers when a customer simply abandons a request.
