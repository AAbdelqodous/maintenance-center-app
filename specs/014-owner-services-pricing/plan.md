# Implementation Plan: My Services Screen — Owner Declares Services & Pricing

**Branch**: `014-owner-services-pricing` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-owner-services-pricing/spec.md`

## Summary

Build a "Manage Services" flow where center owners declare which services they perform and at
what price range, using a structured two-level catalog (category → service type). This replaces
the old flat "Manage Pricing" screen. Three new screens (`services/index`, `services/add`,
`services/[id]`) live under `profile/services/` (a sub-route, not a new tab). Six new RTK Query
endpoints are added to `centerApi.ts`. The profile screen's categories multi-select is removed;
a derived read-only "Categories you serve" section replaces it.

## Technical Context

**Language/Version**: TypeScript 5.x with React Native 0.81.5 + Expo SDK 54  
**Primary Dependencies**: Expo Router (file-based nav), RTK Query (data fetching), React Hook Form + Zod (forms), react-i18next (i18n), Ionicons (icons)  
**Storage**: RTK Query in-memory cache (no new persistence)  
**Testing**: Jest + React Native Testing Library (existing project test setup)  
**Target Platform**: iOS, Android, Web (react-native-web)  
**Project Type**: Mobile app (center owner)  
**Performance Goals**: Services list loads in < 2 s on mobile data (small payload, typically < 50 items)  
**Constraints**: No new third-party dependencies; `StyleSheet.create` for styling (matches existing codebase); web-compatible delete confirmation  
**Scale/Scope**: ~9 new files, 3 modified files; ~500–700 net LOC

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design below.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven | ✅ PASS | spec.md complete and checklist-verified |
| II. Bilingual First | ✅ PASS | All new strings via i18n keys; bilingual description fields; RTL supported |
| III. Component-Driven UI | ✅ PASS | CategorySection, ServiceCard, PriceRangeInput, BilingualDescriptionFields as standalone components |
| IV. API Contract Adherence | ✅ PASS | All data via RTK Query; typed endpoints; auth header via existing baseQuery config |
| V. Owner-Context Awareness | ✅ PASS | Feature is exclusively for center owners; no customer flows |
| VI. Security & Privacy | ✅ PASS | JWT in secure storage (existing, unchanged); no new PII exposed |
| VII. Production Readiness | ✅ PASS | No placeholders; error states for all screens; web-compatible alert guards |

**Post-design re-check**: No violations introduced by the design decisions in `research.md`.

**Complexity Tracking**: N/A — no constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/014-owner-services-pricing/
├── plan.md              ← this file
├── research.md          ← Phase 0 decisions
├── data-model.md        ← types, Zod schemas, derived state
├── quickstart.md        ← developer onboarding
├── contracts/
│   └── rtk-query-hooks.md   ← endpoint signatures
└── tasks.md             ← Phase 2 output (not yet created)
```

### Source Code

```text
maintenance-center-app/
├── app/
│   └── (app)/
│       └── (tabs)/
│           ├── _layout.tsx                    ← MODIFIED: +1 hidden Tabs.Screen
│           └── profile/
│               ├── index.tsx                  ← MODIFIED: remove categories multi-select; add derived display + "Manage Services" row
│               └── services/                  ← NEW directory
│                   ├── _layout.tsx            ← Stack with header
│                   ├── index.tsx              ← MyServicesScreen (list, grouped by category)
│                   ├── add.tsx                ← AddCenterServiceScreen (3-step: category → service → pricing)
│                   └── [id].tsx               ← EditCenterServiceScreen (pricing/desc only; identity read-only)
│
├── components/
│   └── services/                              ← NEW directory
│       ├── servicesSchema.ts                  ← Zod schemas (add + edit)
│       ├── CategorySection.tsx                ← Collapsible section header + ServiceCard list
│       ├── ServiceCard.tsx                    ← Single offering row (name, price, duration, edit/delete actions)
│       ├── PriceRangeInput.tsx                ← Min/max KD numeric inputs with validation
│       └── BilingualDescriptionFields.tsx     ← Ar + En TextArea pair with char counter
│
├── store/
│   └── api/
│       └── centerApi.ts                       ← MODIFIED: +2 tag types, +4 TS types, +6 endpoints, +6 hook exports
│
└── lib/
    ├── utils/
    │   └── formatPrice.ts                     ← NEW: formatPriceRange helper
    └── i18n/
        └── locales/
            ├── en.json                        ← MODIFIED: +services.* keys
            └── ar.json                        ← MODIFIED: +services.* keys (Arabic)
```

**Structure Decision**: Sub-route under `profile/` (not a new tab). Matches the existing pattern for `profile/pricing`, `profile/offers`, `profile/staff`. Tab bar stays at 6 visible tabs. Services is registered as a hidden Tabs.Screen to prevent Expo Router from auto-creating a tab entry.

## Phase 0 — Research Summary

See [research.md](./research.md) for full decisions. Key conclusions:

1. **Placement**: `profile/services/` sub-route (not new top-level tab) — tab bar at comfortable max.
2. **API location**: Add 6 endpoints to existing `centerApi.ts` with `'ServiceCatalog'` and `'CenterServices'` tag types.
3. **Old pricing**: `pricingApi.ts` and `profile/pricing/` are preserved unchanged; removed from profile navigation in this feature; full cleanup is a follow-up task.
4. **Add-flow UX**: Single-screen step indicator (not navigation stack per step) — matches existing `setup-center.tsx` pattern.
5. **Step 2 duplicates**: Disabled (not hidden) — owner understands why a service is not selectable.
6. **Categories multi-select**: Hard removed from profile screen; replaced with derived read-only display.
7. **Edit screen data**: Pre-filled from `getMyCenterServices` cache; no separate GET endpoint.
8. **Styling**: `StyleSheet.create` (matches 100% of existing codebase, not NativeWind).

## Phase 1 — Design Details

### 1.1 RTK Query Endpoints (centerApi.ts changes)

**Tag types** added to existing array:
```typescript
tagTypes: ['Center', 'ServiceCatalog', 'CenterServices'],
```

**Six new endpoints** (full signatures in [contracts/rtk-query-hooks.md](./contracts/rtk-query-hooks.md)):

| Endpoint | Method | Path | Tag |
|----------|--------|------|-----|
| `getAllServices` | GET | `/services` | provides `ServiceCatalog:ALL` |
| `getServicesForCategory(id)` | GET | `/categories/{id}/services` | provides `ServiceCatalog:CAT-{id}` |
| `getMyCenterServices` | GET | `/centers/my/services` | provides `CenterServices:LIST` + per-id |
| `addCenterService` | POST | `/centers/my/services` | invalidates `CenterServices:LIST` |
| `updateCenterService({id, data})` | PUT | `/centers/my/services/{id}` | invalidates per-id + LIST |
| `deleteCenterService(id)` | DELETE | `/centers/my/services/{id}` | invalidates per-id + LIST |

Catalog endpoints use `keepUnusedDataFor: 3600` (1 hour) — catalog changes rarely.

### 1.2 New TypeScript Types (centerApi.ts)

```typescript
ServiceResponse          // admin-curated catalog entry
CenterServiceResponse    // owner's offering (category + service + pricing)
CreateCenterServiceRequest
UpdateCenterServiceRequest
```

Full definitions: [data-model.md](./data-model.md)

### 1.3 Zod Schemas (components/services/servicesSchema.ts)

- `addCenterServiceSchema` — includes `categoryId`, `serviceId`, pricing fields, cross-field `maxPrice >= minPrice` refinement
- `editCenterServiceSchema` — same but omits `categoryId` and `serviceId` (identity immutable)

Full definitions: [data-model.md](./data-model.md)

### 1.4 Screen Logic

#### MyServicesScreen (`services/index.tsx`)

```
useGetMyCenterServicesQuery()
  → loading → ActivityIndicator
  → error → error state + retry button
  → empty → empty state + "Add your first service" button
  → data → group by category.id → render CategorySection[] per group
  → FAB: "+" button → router.push('.../services/add')
```

Grouping logic:
```typescript
const grouped = useMemo(() => {
  const map = new Map<number, { category: ServiceCategory; services: CenterServiceResponse[] }>();
  (data ?? []).forEach(s => {
    if (!map.has(s.category.id)) map.set(s.category.id, { category: s.category, services: [] });
    map.get(s.category.id)!.services.push(s);
  });
  return Array.from(map.values());
}, [data]);
```

#### AddCenterServiceScreen (`services/add.tsx`)

Step state: `const [step, setStep] = useState<1 | 2 | 3>(1);`

- **Step 1** (category select): renders category chips from `useGetCategoriesQuery()`. Tap to advance.
- **Step 2** (service select): renders service list from `useGetServicesForCategoryQuery(selectedCategoryId)`. Computes `alreadyOfferedIds` from `useGetMyCenterServicesQuery()` cache. Disabled services show lock icon + "Already added" label.
- **Step 3** (pricing + description): `PriceRangeInput` + `BilingualDescriptionFields`. Submit calls `addCenterService`. On success: `router.back()`.

RHF form covers all steps; validation runs on submit (not per-step). Step indicator shows 3 dots.

#### EditCenterServiceScreen (`services/[id].tsx`)

```typescript
const { id } = useLocalSearchParams<{ id: string }>();
const { data: services } = useGetMyCenterServicesQuery();
const offering = services?.find(s => s.id === Number(id));
```

Pre-fills edit form from `offering`. Read-only labels for `offering.category.name` and `offering.service.name`. Submit calls `updateCenterService`. Delete: `deleteCenterService(id)` → `router.back()` after confirmation.

### 1.5 Component Specs

#### CategorySection
```
Props: { category: ServiceCategory; services: CenterServiceResponse[]; onEditService: (id) => void; onDeleteService: (id) => void }
Renders: section header (category name in current locale) + FlatList of ServiceCard
```

#### ServiceCard
```
Props: { item: CenterServiceResponse; onEdit: () => void; onDelete: () => void }
Renders: service name | price range or "Price on request" | duration (if set) | edit icon | delete icon
Min touch target: 44pt height enforced via minHeight style
```

#### PriceRangeInput
```
Props: { control: Control; errors: FieldErrors; isRTL: boolean }
Two Controller-wrapped TextInput with keyboardType="decimal-pad"
Displays "KD" suffix label
```

#### BilingualDescriptionFields
```
Props: { control: Control; errors: FieldErrors; isRTL: boolean }
Two Controller-wrapped multiline TextInput (Ar + En)
Character counter displayed below each field (e.g. "0/500")
```

### 1.6 Profile Screen Modifications (profile/index.tsx)

**Remove**:
- `const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);` (line 50)
- `const { data: allCategories } = useGetCategoriesQuery();` (line 26 import and usage)
- `setSelectedCategoryIds(center.categories?.map((c) => c.id) ?? []);` (in useEffect)
- `selectedCategoryIds.length === 0` validation check in `handleUpdateProfile`
- `categoryIds: selectedCategoryIds` in `updateCenter` call
- The entire categories section (lines ~333–355: categoriesGrid + chips)

**Add**:
- `const { data: centerServices } = useGetMyCenterServicesQuery();` 
- `derivedCategories` memo (see data-model.md)
- A new read-only "Categories you serve" section using derived categories as chips (no onPress)
- "Manage Services →" menu row navigating to `'/(app)/(tabs)/profile/services'`

**Change**:
- "Manage Pricing" menu row (currently navigates to `profile/pricing`) → rename to "Manage Services" and navigate to `profile/services` instead

### 1.7 i18n Keys

**en.json** — add under `"services"`:
```json
"services": {
  "title": "My Services",
  "manageServices": "Manage Services",
  "addService": "Add Service",
  "addFirstService": "Add Your First Service",
  "noServices": "No services added yet",
  "noServicesSubtitle": "Add the services your center performs to let customers know what you offer.",
  "step1Title": "Select Category",
  "step2Title": "Select Service",
  "step3Title": "Pricing & Details (Optional)",
  "alreadyAdded": "Already added",
  "priceOnRequest": "Price on request",
  "minPrice": "Min Price (KD)",
  "maxPrice": "Max Price (KD)",
  "duration": "Typical Duration (minutes)",
  "descriptionAr": "Description (Arabic, optional)",
  "descriptionEn": "Description (English, optional)",
  "categoriesServed": "Categories You Serve",
  "next": "Next",
  "back": "Back",
  "save": "Save",
  "deleteConfirmTitle": "Remove Service",
  "deleteConfirmMessage": "Stop offering this service? Customers won't see it on your booking page.",
  "deleteConfirmWeb": "Stop offering this service? Customers won't see it on your booking page.",
  "saved": "Service saved",
  "deleted": "Service removed",
  "errorSave": "Failed to save. Please try again.",
  "errorDelete": "Failed to remove. Please try again.",
  "errorLoad": "Could not load services. Tap to retry.",
  "maxPriceError": "Max price must be ≥ min price",
  "durationError": "Duration must be at least 1 minute",
  "charCount": "{{count}}/500",
  "editService": "Edit Service",
  "category": "Category",
  "service": "Service"
}
```

Arabic equivalents added in `ar.json` with natural RTL phrasing.

## Dependency Order

```
Task 1 (types + endpoints)
  → Task 2 (i18n keys)
    → Task 3 (formatPrice utility)
      → Task 4 (Zod schemas component)
        → Task 5 (PriceRangeInput + BilingualDescriptionFields components)
          → Task 6 (ServiceCard component)
            → Task 7 (CategorySection component)
              → Task 8 (MyServicesScreen + _layout)
                → Task 9 (AddCenterServiceScreen)
                  → Task 10 (EditCenterServiceScreen)
                    → Task 11 (profile/index.tsx modification)
                      → Task 12 (_layout.tsx modification — hidden Tabs.Screen)
                        → Task 13 (smoke test + RTL spot-check)
```

Tasks 1–7 can be built and tested against a mocked backend.
Tasks 8–13 require the Phase 3.6 backend endpoints to be live.
