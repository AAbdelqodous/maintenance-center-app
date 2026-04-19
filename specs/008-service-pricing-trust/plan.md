# Implementation Plan: Phase 3.5 — Service Pricing & Trust Badges

**Branch**: `002-service-pricing-trust` | **Date**: 2026-04-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-service-pricing-trust/spec.md`

## Summary

Center owners need to publish transparent service pricing to build customer trust. This phase adds a full pricing CRUD flow accessible from the Profile tab: a pricing list screen, an add screen, and an edit screen (with active/pause toggle and delete). Forms use React Hook Form + Zod with inline validation. Prices display in `KD X.XXX` format. A separate Trust Badges screen shows earned and locked badges; it degrades gracefully if the backend trust endpoint is not yet deployed. Four new RTK Query endpoints (`GET/POST/PUT/DELETE /centers/my/pricing`) and one optional trust endpoint are added via `pricingApi.ts` and `trustApi.ts`. All text is bilingual (Arabic + English) via i18n keys; all dialogs are platform-aware (no `Alert.alert` on web).

## Technical Context

**Language/Version**: TypeScript 5.x + React Native 0.81.5 + Expo SDK 54
**Primary Dependencies**: React Hook Form + Zod (forms/validation), RTK Query (data fetching), NativeWind (styling), react-i18next (i18n)
**New Dependencies**: None — all libraries already in the project
**Storage**: N/A — no local persistence; all data lives on the backend
**Testing**: No automated tests for this phase — manual smoke test checklist in `quickstart.md`
**Target Platform**: iOS 15+, Android API 31+, React Native Web
**Project Type**: Mobile app feature — new screens + components + RTK Query slice
**Performance Goals**: Pricing list loads within 2s on 4G; add entry under 90s end-to-end (SC-001, SC-002)
**Constraints**: Expo managed workflow; `Alert.alert` replaced by `window.confirm` on web; `KD X.XXX` 3-decimal format enforced everywhere
**Scale/Scope**: 3 new screens, 3 new components, 2 new RTK slices, 1 utility module, 1 types file, 1 Zod schema, i18n keys in 2 locales, 1 profile screen modification

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Spec approved; planning before implementation |
| II. Bilingual First | ✅ Pass | `serviceNameAr`/`serviceNameEn` fields; all strings via `pricing.*` and `trustBadge.*` i18n keys; RTL layout required |
| III. Component-Driven UI | ✅ Pass | `PricingCard`, `PricingForm`, `TrustBadgeCard` are independent reusable components; screens compose them |
| IV. API Contract Adherence | ✅ Pass | All data via RTK Query; `pricingApi.ts` follows CLAUDE.md spec verbatim; `'Pricing'` tag already in tagTypes |
| V. Owner-Context Awareness | ✅ Pass | Pricing and trust are center management features — no customer discovery flows |
| VI. Security & Privacy | ✅ Pass | JWT-authenticated endpoints; HTTPS in production (Phase 2.5); no PII in pricing data |
| VII. Production Readiness | ✅ Pass | ErrorBoundary wraps Profile tab (Phase 2.5); no placeholders; no feature flags |

**Constitution Check Result**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-service-pricing-trust/
├── plan.md                      # This file
├── research.md                  # Phase 0: form library, price format, navigation decisions
├── data-model.md                # Phase 1: TypeScript types, Zod schema, RTK slices, i18n keys, component map
├── quickstart.md                # Phase 1: step-by-step guide + smoke test checklist
├── contracts/
│   └── pricing-api.md           # Phase 1: API endpoint contracts
├── checklists/
│   └── requirements.md          # Spec quality checklist
└── tasks.md                     # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
types/
└── pricing.ts                   # NEW: CenterServicePricing, CreatePricingRequest, UpdatePricingRequest,
                                 #      TrustBadge, TrustSummary, re-exports ServiceType

lib/utils/
└── pricing.ts                   # NEW: formatKD(), formatPriceRange()

components/pricing/
├── pricingSchema.ts             # NEW: Zod schema with maxPrice ≥ minPrice refinement
├── PricingCard.tsx              # NEW: list item component (bilingual name, price range, active badge)
├── PricingForm.tsx              # NEW: shared React Hook Form component (add + edit)
└── TrustBadgeCard.tsx           # NEW: earned/locked badge display card

store/api/
├── pricingApi.ts                # NEW: 4 RTK Query endpoints (GET/POST/PUT/DELETE)
└── trustApi.ts                  # NEW: 1 RTK Query endpoint (GET /centers/my/trust)

app/(app)/(tabs)/profile/
├── index.tsx                    # MODIFY: add "Manage Pricing" + "Trust Badges" rows
├── pricing/
│   ├── _layout.tsx              # NEW: Stack navigator for pricing sub-screens
│   ├── index.tsx                # NEW: Pricing list screen (FlatList + FAB)
│   ├── add.tsx                  # NEW: Add pricing screen
│   └── [id].tsx                 # NEW: Edit pricing screen (pre-populated, toggle, delete)
└── trust.tsx                    # NEW: Trust badges screen (earned/locked, graceful degradation)

lib/i18n/locales/
├── en.json                      # ADD: pricing.* and trustBadge.* namespace keys
└── ar.json                      # ADD: Arabic translations for pricing.* and trustBadge.*
```

**Structure Decision**: Mobile-only feature. Pricing screens live under `profile/pricing/` as a nested Expo Router stack — this gives natural back-navigation without any extra navigator configuration. Trust badges live as a sibling screen `profile/trust.tsx`. The shared `PricingForm` component is reused by both the add and edit screens to avoid duplicated form logic.

## Complexity Tracking

> No constitution violations — this section is not applicable.
