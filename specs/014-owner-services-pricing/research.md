# Research: My Services Screen — Owner Declares Services & Pricing

**Branch**: `014-owner-services-pricing` | **Date**: 2026-05-10

---

## Decision 1 — Placement: Sub-route Under Profile, Not a New Top-level Tab

**Decision**: Place the Services screens at `app/(app)/(tabs)/profile/services/` (alongside existing `profile/pricing/`, `profile/offers/`, `profile/staff/`). Do not add a new Tabs.Screen entry.

**Rationale**: The tab bar in `app/(app)/(tabs)/_layout.tsx` already renders 6 visible tabs (Dashboard, Bookings, Reviews, Notifications, Analytics, Profile) plus a conditional Admin tab. Adding a 7th crowding tab risks layout breakage on smaller screens. Profile is the natural owner of center configuration screens. All three existing configuration sub-flows (pricing, offers, staff) follow the same `profile/X` sub-route pattern. The Profile screen already serves as a "settings hub" with menu rows navigating to sub-sections.

**Alternatives considered**:
- 6th visible tab: rejected — tab bar already at comfortable max for 5-inch screens; Notifications badge would be pushed off.
- Drawer/overflow: rejected — no drawer component exists in the codebase; adding one is a significant new dependency.

**How to register**: Add `<Tabs.Screen name="profile/services" options={{ href: null }} />` in `_layout.tsx` alongside the existing `profile/pricing`, `profile/offers`, `profile/staff` hidden registrations.

---

## Decision 2 — API Location: Add to centerApi.ts, Not a New servicesApi.ts

**Decision**: Inject all 6 new endpoints (3 catalog reads + 3 owner CRUD) into the existing `centerApi` using the `injectEndpoints` pattern (or by expanding the `endpoints` builder directly). Do not create a separate `servicesApi.ts` file.

**Rationale**: The spec explicitly requires this to stay consistent with project conventions. `centerApi.ts` already owns the `getCategories` endpoint (which hits `/categories`), so catalog-adjacent reads belong there. Keeping it in one file avoids a third `createApi` instance for center-related data and prevents the RTK store from fragmenting further.

**Tag types to add** to `centerApi`'s existing `tagTypes: ['Center']` array:
- `'ServiceCatalog'` — for read-only catalog endpoints (`getAllServices`, `getServicesForCategory`)
- `'CenterServices'` — for owner offering endpoints (`getMyCenterServices` and mutations)

**Note on 'Pricing' tag**: `pricingApi.ts` still uses `tagTypes: ['Pricing']`. That file is NOT modified in this feature. The old pricing screens (`profile/pricing/`) remain working during the transition. A future cleanup task will retire `pricingApi.ts` and `profile/pricing/` after full migration.

**Alternatives considered**:
- New `servicesApi.ts`: rejected per explicit feature constraint and to avoid store fragmentation.
- Adding to `lookupsApi.ts`: rejected — lookups are static reference data with 24-hour cache; owner service offerings mutate frequently.

---

## Decision 3 — Old Pricing System: Coexist During Transition, Remove in a Follow-up

**Decision**: The existing `pricingApi.ts` and `profile/pricing/` screens are NOT touched in this feature branch. They remain working alongside the new `profile/services/` screens. The profile screen's "Manage Pricing" row is replaced with "Manage Services" and the categories multi-select is removed. A follow-up cleanup task (separate branch) deletes `pricingApi.ts`, `profile/pricing/`, and any remaining `CenterServicePricing` type references.

**Rationale**: Removing a working screen and an API file in the same branch that introduces a new screen is risky: if the backend `DELETE /centers/my/pricing/{id}` API is still live, existing pricing data is still valid. Owners with existing pricing entries should not lose access to them while the new services entries are being created. The profile menu row change ("Manage Pricing" → "Manage Services") is the only visible change to the profile screen's navigation section for this feature.

**Alternatives considered**:
- Delete pricing in same branch: rejected — could orphan existing pricing data; increases scope and risk.
- Keep both links in profile: rejected — two links for similar concepts creates confusion.

---

## Decision 4 — Add-flow UX: Three Steps on One Screen with Step Indicator, Not Navigation Stack

**Decision**: The three-step add flow (step 1: category, step 2: service, step 3: pricing) is implemented as a single screen (`profile/services/add.tsx`) with a step indicator rendered at the top. Each "Next" press advances internal state — no navigation push per step. The form submits as a single RHF object.

**Rationale**: Navigation-stack-per-step means the back button is handled by Expo Router, which is correct for accessibility, but complicates passing selected values between screens (route params vs. navigation state). A single-screen step indicator is simpler (one form, one submit), preserves form state on network failure without any special handling, and is the pattern used in the existing `app/(app)/setup-center.tsx` onboarding flow.

**Alternatives considered**:
- Separate route per step: rejected — over-engineered for 3 simple steps; param passing is verbose.
- Modal sheet: rejected — no bottom sheet library in the project; adding one is a new dependency.

---

## Decision 5 — Step 2 Duplicate Prevention: Disabled Items, Not Hidden

**Decision**: When the owner selects a category in step 1, step 2 shows ALL services valid for that category. Services already offered by this center in that category are rendered with disabled styling (grey, lower opacity, a "lock" icon, `accessibilityState={{ disabled: true }}`). They are not hidden.

**Rationale**: Hiding already-added services confuses owners who wonder "why isn't [service X] in the list?" — they may think the backend removed it or there's a bug. Showing it as disabled with a label ("Already added") teaches owners the constraint. This matches the spec FR-003 and User Story 2, Scenario 1.

**How to implement**: After fetching `getMyCenterServices` and `getServicesForCategory(selectedCategoryId)`, compute `alreadyOfferedServiceIds = Set(myCenterServices.filter(s => s.category.id === selectedCategoryId).map(s => s.service.id))`. Any service whose `id` is in that set is rendered as disabled.

---

## Decision 6 — Categories Multi-select Removal: Hard Remove, No Deprecation Period

**Decision**: The `selectedCategoryIds` state, `setSelectedCategoryIds`, the `allCategories` query, the `categoriesGrid` section (lines 333–355 of `profile/index.tsx`), and `categoryIds` in `UpdateCenterRequest` are all removed in the profile modification task. The `PUT /centers/my` call stops sending `categoryIds`. A read-only "Categories you serve" section (derived from `getMyCenterServices`) replaces it.

**Rationale**: Keeping the multi-select while the Services screen is live creates two competing sources of truth for the center's categories. If an owner adds a service under "Car" via the new flow but the multi-select still shows "Electronics" as selected, the category data on the center profile becomes inaccurate. The backend should stop using `categoryIds` from the PUT request in Phase 3.6 backend work; the frontend stops sending it simultaneously.

**Risk**: If the backend still requires `categoryIds` in the PUT body for another reason, this will surface as a validation error. The plan addresses this with an explicit note: the profile update regression test must confirm that removing `categoryIds` from the PUT body does not cause a 400.

---

## Decision 7 — Edit Screen: Pre-fill from List Cache, Not a Separate GET

**Decision**: The edit screen (`profile/services/[id].tsx`) receives the service id from the route param and finds the full offering by filtering the `getMyCenterServices` cache result (using `selectFromResult`). No separate "get one service" endpoint is added.

**Rationale**: `getMyCenterServices` returns all active offerings, which is typically a small list (under 50 items for any center). Filtering client-side is O(n) and instant. Avoiding an extra endpoint keeps the API surface minimal and prevents a flash of loading state on the edit screen. If the offering is not found in cache (e.g., user navigated directly via deep link), the screen shows a "Not found" state and a Back button.

**Alternatives considered**:
- Separate `GET /centers/my/services/{id}`: rejected — would require a new backend endpoint not in the locked contract.

---

## Decision 8 — NativeWind vs StyleSheet: Use StyleSheet Consistently with Existing Code

**Decision**: New components and screens use `StyleSheet.create` (matching the existing codebase's style), not NativeWind/Tailwind CSS utility classes.

**Rationale**: The constitution says "NativeWind for styling — no inline StyleSheet.create unless strictly necessary" but the entire existing codebase uses `StyleSheet.create` throughout (profile/index.tsx, pricingCard.tsx, reviewCard.tsx, etc.). Introducing NativeWind in a subset of new files creates a style system split that makes the codebase harder to maintain. The constitution principle will be applied uniformly in a future refactor; this feature follows the dominant existing pattern.

**Alternatives considered**:
- NativeWind in new files only: rejected — creates two parallel styling systems in the codebase.
