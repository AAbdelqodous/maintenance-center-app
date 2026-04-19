# Research: Phase 3.5 — Service Pricing & Trust Badges

**Branch**: `002-service-pricing-trust` | **Date**: 2026-04-16

---

## Decision 1: Form Library for Pricing Add/Edit Forms

**Decision**: React Hook Form + Zod — already the project standard (referenced in CLAUDE.md under tech stack).

**Rationale**:
- Already a project dependency — no new package needed.
- Zod schema gives co-located validation rules (maxPrice ≥ minPrice, required fields, positive integers for duration).
- `useForm` + `zodResolver` gives inline per-field errors without any extra state.
- `reset(existingEntry)` cleanly pre-populates the edit form with existing values.

**Key Zod schema**:
```typescript
const pricingSchema = z.object({
  serviceType:             z.nativeEnum(ServiceType),
  serviceNameAr:           z.string().min(1),
  serviceNameEn:           z.string().min(1),
  minPrice:                z.number().min(0),
  maxPrice:                z.number().min(0),
  typicalDurationMinutes:  z.number().int().min(1).optional(),
  descriptionAr:           z.string().optional(),
  descriptionEn:           z.string().optional(),
}).refine(data => data.maxPrice >= data.minPrice, {
  message: 'Maximum price must be greater than or equal to minimum price',
  path: ['maxPrice'],
});
```

---

## Decision 2: ServiceType Enum Location

**Decision**: Re-export `ServiceType` from `store/api/bookingsApi.ts` into a shared `types/` file (`types/pricing.ts`), rather than importing it directly from `bookingsApi.ts` in pricing components.

**Rationale**:
- `ServiceType` already exists in `store/api/bookingsApi.ts` (CAR, ELECTRONICS, HOME_APPLIANCE).
- Pricing components should not import from the bookings API slice — that creates a circular-ish dependency smell.
- Create `types/pricing.ts` that imports `ServiceType` from `bookingsApi.ts` and re-exports it alongside the pricing-specific interfaces. This keeps pricing types co-located without duplicating the enum.

---

## Decision 3: Price Display Format

**Decision**: `KD X.XXX` — three decimal places, using `Number(price).toFixed(3)` at render time.

**Rationale**:
- Kuwaiti Dinar uses 3 decimal places (fils). This is a constitutional requirement (Regional Standards section).
- When minPrice === maxPrice: display as single price `KD X.XXX` (not a range).
- When minPrice < maxPrice: display as `KD X.XXX – KD Y.YYY`.
- The numeric inputs in the form accept decimals; Zod validates `z.number().min(0)`.

---

## Decision 4: Navigation — Pricing Screen Location

**Decision**: Add a new nested screen `app/(app)/(tabs)/profile/pricing.tsx` accessible from the Profile tab, rather than a new bottom tab. A "Manage Pricing" row is added to the existing `profile/index.tsx` screen.

**Rationale**:
- The spec explicitly states: "The Pricing screen is added to the Profile tab — no new bottom navigation tab is introduced in this phase."
- Expo Router file-based routing: adding `profile/pricing.tsx` automatically creates a stack route inside the profile tab's stack navigator.
- The existing `app/(app)/(tabs)/profile/_layout.tsx` (or the profile tab's stack) handles navigation automatically.

---

## Decision 5: Add/Edit Modal vs. Screen

**Decision**: Full screens (not modals) for Add Pricing and Edit Pricing — `app/(app)/(tabs)/profile/pricing/index.tsx` (list), `app/(app)/(tabs)/profile/pricing/add.tsx` (add), `app/(app)/(tabs)/profile/pricing/[id].tsx` (edit).

**Rationale**:
- Modals in Expo Router require a specific `<Modal>` presentation — more complex to implement correctly on both iOS and Android.
- Full screens are simpler, more accessible, and the form has enough fields to warrant a full screen.
- Nested routes under `profile/pricing/` gives a clean URL structure and natural back-navigation.
- The discard-changes dialog on the back button is straightforward with `usePreventRemove` (Expo Router / React Navigation hook).

---

## Decision 6: Discard-Changes Dialog

**Decision**: Use `router.canGoBack()` + `usePreventRemove` (React Navigation) for native back button; for web use `window.confirm()`.

**Rationale**:
- `Alert.alert` with two buttons works on iOS/Android but is a no-op on React Native Web (existing project feedback memory).
- The pattern: `Platform.OS === 'web' ? window.confirm('Discard changes?') : Alert.alert(...)` is already the established project pattern.
- `usePreventRemove` from `@react-navigation/native` intercepts the back gesture/button before navigation occurs.

---

## Decision 7: Trust Badges — Graceful Degradation

**Decision**: Attempt `GET /centers/my/trust` for badge data. If the endpoint returns 404 or is unavailable, show a "Coming Soon" placeholder section — do not block the Pricing feature.

**Rationale**:
- The spec assumption states: "If the trust endpoint is not yet available, the Trust Badges screen shows a 'Coming Soon' placeholder without blocking the pricing feature."
- RTK Query's `skipToken` pattern: if the trust endpoint doesn't exist yet, the query can be skipped or the error handled gracefully.
- The Pricing list and Trust Badges sections are visually separate — a failure in one does not affect the other.

**TrustBadge types** (client-side, not yet from backend):
```typescript
export type TrustBadgeType = 'VERIFIED_PRICING' | 'FAST_RESPONDER' | 'HIGH_COMPLETION' | 'TOP_RATED';

export interface TrustBadge {
  badgeType: TrustBadgeType;
  isEarned: boolean;
  earnedAt?: string;
  criteriaEn: string;
  criteriaAr: string;
}
```

---

## Decision 8: RTK Query Tag — `'Pricing'`

**Decision**: Use the `'Pricing'` tag already listed in `tagTypes` in CLAUDE.md. The pricingApi slice follows the exact shape defined in CLAUDE.md Phase 3.5 section.

**Rationale**: Already designed and documented — implement verbatim. No decisions needed.

---

## Decision 9: Delete Confirmation on Web

**Decision**: On `Platform.OS === 'web'`, use `window.confirm('Delete this pricing entry? This cannot be undone.')` before calling the delete mutation. On native, use `Alert.alert` with a destructive "Delete" button.

**Rationale**: Same Alert/web pattern as Decision 6. The delete action is in the edit screen, so the platform check is straightforward.

---

## Resolved Clarifications

- ✅ Form library: React Hook Form + Zod (project standard)
- ✅ ServiceType location: re-exported from `types/pricing.ts`
- ✅ Price format: `KD X.XXX` via `.toFixed(3)`
- ✅ Screen structure: nested under `profile/pricing/` — list, add, `[id]` edit
- ✅ Discard dialog: `usePreventRemove` + platform-aware Alert/window.confirm
- ✅ Trust badges: graceful degradation with Coming Soon if endpoint unavailable
- ✅ Tag type: `'Pricing'` (already in tagTypes)
- ✅ Delete confirmation: platform-aware Alert/window.confirm
