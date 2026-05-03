# Research: Offers & Promotions

**Branch**: `013-offers-promotions` | **Date**: 2026-05-03

---

## Decision 1 — OfferStatus: stored vs computed dynamically

**Decision**: Compute status dynamically in the service layer from date fields and a `cancelledAt` timestamp. Do not store a `status` column in the DB.

**Rationale**: A stored status column requires a scheduled job to flip SCHEDULED → ACTIVE → EXPIRED on time. `ddl-auto: update` makes that operational complexity unnecessary. Computing from dates is always accurate, zero-lag, and eliminates the scheduled job entirely. The `OfferResponse` exposes the computed `OfferStatus` enum as a serialised string.

**Status computation logic** (in priority order):
1. `cancelledAt IS NOT NULL` → `CANCELLED`
2. `startDate > today` → `SCHEDULED`
3. `endDate >= today` → `ACTIVE`
4. else → `EXPIRED`

**Alternatives considered**:
- Stored `status` column + scheduled job → rejected: operational overhead, potential drift
- Spring `@Scheduled` updater → rejected: still async; status can be stale mid-request

---

## Decision 2 — cancelledAt field instead of isCancelled boolean

**Decision**: Use `LocalDateTime cancelledAt` (nullable) instead of `boolean isCancelled`.

**Rationale**: Records when the cancellation happened at no extra cost, which is useful for future audit logs. A boolean carries no timestamp information. Nullable datetime is idiomatic for "optional event timestamp" in the existing codebase pattern (see `emailVerifiedAt` on `User`).

---

## Decision 3 — applicableServiceTypes storage

**Decision**: `@ElementCollection` stored in a join table `center_offer_service_types`.

**Rationale**: Consistent with existing patterns in the codebase — `MaintenanceCenter.workingDays` uses `@ElementCollection`. Allows proper querying and future indexing. Empty list = applies to all services (no filtering needed on the customer side).

**Alternatives considered**:
- Comma-separated string column → rejected: no type safety, requires parsing, cannot be indexed
- Separate `CenterOfferServiceType` entity with `@OneToMany` → overkill for a simple enum list

---

## Decision 4 — discountValue precision

**Decision**: `BigDecimal` with `DECIMAL(10,3)` for both PERCENTAGE and FIXED_AMOUNT.

**Rationale**: FIXED_AMOUNT must support KD 3-decimal precision. PERCENTAGE values like 15% or 99.5% fit within 3 decimal places. Using a single field type for both simplifies the entity. Validation enforces ≤ 100 for PERCENTAGE at the service layer.

---

## Decision 5 — Offer cap enforcement mechanism

**Decision**: In `OfferService.createOffer()`, count active+scheduled offers before inserting:

```
count WHERE center_id = ? 
  AND cancelledAt IS NULL 
  AND endDate >= today
```

If count ≥ 10, throw `IllegalStateException` → mapped to `400 Bad Request`.

**Rationale**: Pure query-based check, no stored status column needed. Race condition risk is minimal (cap is a soft abuse-prevention limit, not a financial constraint).

---

## Decision 6 — Edit restrictions for ACTIVE offers

**Decision**: In `OfferService.updateOffer()`, compute current status before applying changes:
- If ACTIVE: reject changes to `discountType`, `discountValue`, `startDate`, `applicableServiceTypes`; allow `endDate` only if new value > current `endDate`; allow title and description freely
- If SCHEDULED: allow all fields
- If EXPIRED or CANCELLED: reject with `400 Bad Request`

**Rationale**: Prevents mid-promotion bait-and-switch on core terms (discount amount, scope). Allows operators to extend a successful promotion or fix a typo in the description.

---

## Decision 7 — RTK Query tag type

**Decision**: Add `'Offers'` to `tagTypes` in the base API slice.

**Rationale**: Consistent with existing pattern (`'Pricing'`, `'WorkProgress'`, etc.). `offersApi` will use `providesTags: ['Offers']` and mutations will `invalidatesTags: ['Offers']`.

---

## Decision 8 — Frontend screen layout

**Decision**: Offers nested under the profile tab at `app/(app)/(tabs)/profile/offers/`:

```
profile/offers/
├── _layout.tsx     — Stack layout
├── index.tsx       — Offer list with status filter tabs
├── add.tsx         — Add offer form
└── [id].tsx        — Offer detail + edit + cancel
```

Accessed from the profile index screen via a navigation card (same pattern as pricing).

**Rationale**: Offers are a center profile concern — they describe the center's current promotions. Nesting under profile is consistent with how pricing is structured.

---

## Decision 9 — Status filter tabs

**Decision**: 4 tabs: **All | Active | Scheduled | Expired** — Cancelled is visible in "All" only.

**Rationale**: Cancelled offers are historical noise. Owners primarily care about what's running (Active), what's coming (Scheduled), and what ran (Expired). A separate "Cancelled" tab adds a tab for rarely-needed content. All tab always shows everything for completeness.

---

## Decision 10 — OfferForm field-lock on web

**Decision**: On web (`Platform.OS === 'web'`), locked fields for ACTIVE offers are rendered as non-editable `<Text>` elements (not disabled inputs), consistent with the approach used in other form screens. On native, `editable={false}` on `TextInput`.

---

## Summary of new files

### Backend (service-center)

| Type | File | Notes |
|------|------|-------|
| NEW | `offer/CenterOffer.java` | Entity |
| NEW | `offer/DiscountType.java` | Enum: PERCENTAGE, FIXED_AMOUNT |
| NEW | `offer/OfferStatus.java` | Enum: SCHEDULED, ACTIVE, EXPIRED, CANCELLED |
| NEW | `offer/OfferRepository.java` | JPA repository |
| NEW | `offer/OfferService.java` | Business logic |
| NEW | `offer/OfferController.java` | REST controller |
| NEW | `offer/OfferRequest.java` | Create/update DTO |
| NEW | `offer/OfferResponse.java` | Response DTO |

### Frontend (maintenance-center-app)

| Type | File | Notes |
|------|------|-------|
| NEW | `types/offers.ts` | TypeScript interfaces |
| NEW | `store/api/offersApi.ts` | RTK Query endpoints |
| NEW | `components/offers/OfferCard.tsx` | List card |
| NEW | `components/offers/OfferForm.tsx` | Create/edit form |
| NEW | `components/offers/OfferStatusBadge.tsx` | Status chip |
| NEW | `app/(app)/(tabs)/profile/offers/_layout.tsx` | Stack layout |
| NEW | `app/(app)/(tabs)/profile/offers/index.tsx` | Offer list |
| NEW | `app/(app)/(tabs)/profile/offers/add.tsx` | Add screen |
| NEW | `app/(app)/(tabs)/profile/offers/[id].tsx` | Detail/edit screen |
| MODIFY | `store/index.ts` (or baseApi) | Add `'Offers'` to tagTypes |
| MODIFY | `lib/i18n/locales/en.json` | Add `offers.*` keys |
| MODIFY | `lib/i18n/locales/ar.json` | Add `offers.*` keys |
| MODIFY | `app/(app)/(tabs)/profile/index.tsx` | Add Offers navigation card |
