# Implementation Plan: Attention Required Panel

**Branch**: `016-attention-required-panel` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/016-attention-required-panel/spec.md`

---

## Summary

Add an "Attention Required" panel to the existing branch manager dashboard that surfaces five categories of operational items (overdue bookings, stalled bookings, unassigned bookings, low-rated reviews, unanswered chats) derived client-side from the existing RTK Query API. The panel auto-refreshes every 60 seconds while in focus, supports pull-to-refresh, renders an "All clear" state when empty, and is fully bilingual (Arabic RTL + English LTR). No new backend endpoints are required. The sixth category (Pending Quotes) is deferred to Phase 4.0.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: React Native 0.81.5, Expo SDK 54, RTK Query (Redux Toolkit), Expo Router, react-i18next, @react-navigation/native (`useIsFocused`)  
**Storage**: N/A — panel state is ephemeral (in-memory RTK Query cache)  
**Testing**: Manual smoke testing (per quickstart.md); component testing with Jest + React Native Testing Library (pattern from constitution)  
**Target Platform**: iOS + Android + Web (React Native Web)  
**Performance Goals**: Panel data loads within 3 seconds; polling does not degrade dashboard frame rate  
**Constraints**: Poll pauses when screen is unfocused; error in panel must not block rest of dashboard; Pending Quotes deferred  
**Scale/Scope**: Designed for a single active branch; up to 50 active bookings, 20 reviews, 20 conversations per poll cycle

---

## Constitution Check

### Gate 1 — Spec-Driven Development ✅
Spec exists at `specs/016-attention-required-panel/spec.md`. Plan follows spec order. No code written before this plan.

### Gate 2 — Bilingual First ✅
All display strings are delivered via i18n keys under `attention.*`. Both `en.json` and `ar.json` are updated in parallel. No hardcoded display strings.

### Gate 3 — Component-Driven UI ✅
Panel is decomposed into: `AttentionPanel` (container), `AttentionItem` (row), `AllClearState` (empty state). Parent dashboard screen composes these components. NativeWind/Tailwind classes used for styling.

### Gate 4 — API Contract Adherence ✅
All data fetching uses RTK Query typed endpoints. No raw `fetch` calls. Auth headers are handled by the existing `baseQuery`. No new backend endpoints are introduced.

### Gate 5 — Owner-Context Awareness ✅
Panel is placed in the owner/manager dashboard. Items are scoped to the active branch via the existing `activeCenterId` in Redux (all booking/review/chat queries are already center-scoped server-side).

### Gate 6 — Security & Privacy ✅
No new auth or storage patterns introduced. JWT is handled by existing middleware. No PII logged.

### Gate 7 — Production Readiness ✅
No feature flags. No pseudocode. Pending Quotes is not stubbed — the slot simply emits zero items, which is production-correct behavior. Error boundary wraps the panel at component level.

---

## Project Structure

### Documentation (this feature)

```text
specs/016-attention-required-panel/
├── plan.md                   # This file
├── spec.md                   # Feature specification
├── research.md               # Phase 0 decisions
├── data-model.md             # Derived types and derivation rules
├── quickstart.md             # Developer setup and manual test guide
├── contracts/
│   └── api-consumption.md   # Which endpoints are consumed and how
└── tasks.md                  # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (new and modified files)

```text
hooks/
└── useAttentionItems.ts             # NEW — core derivation hook

components/dashboard/
├── AttentionPanel.tsx               # NEW — panel container, owns loading/error state
├── AttentionItem.tsx                # NEW — single attention item row
└── AllClearState.tsx                # NEW — "All clear" empty state card

app/(app)/(tabs)/
└── index.tsx                        # MODIFIED — add <AttentionPanel /> section

lib/i18n/locales/
├── en.json                          # MODIFIED — add attention.* keys
└── ar.json                          # MODIFIED — add attention.* keys (Arabic)
```

**Structure Decision**: All new components go under `components/dashboard/` per the existing component organization pattern (analytics, bookings, reviews all have dedicated subdirectories). The `hooks/` directory is created new — small focused custom hooks that bridge RTK Query data with component logic belong here rather than inside component files.

---

## Phase 0: Research ✅ Complete

See `research.md` for all decisions. Key outcomes:
- Client-side derivation from 3 existing endpoints (no new backend work)
- Overdue detection uses `bookingDate + bookingTime` as scheduled time proxy
- Stalled detection gates on `openingTime`/`closingTime` from center profile
- Pending Quotes deferred to Phase 4.0
- RTK Query polling with `pollingInterval: 0` when screen unfocused

---

## Phase 1: Design & Contracts ✅ Complete

### Data Model

See `data-model.md`. Key types:

```typescript
// types/attention.ts  (new file)
export type AttentionCategory =
  | 'OVERDUE_BOOKING' | 'STALLED_BOOKING' | 'UNASSIGNED_BOOKING'
  | 'PENDING_QUOTE' | 'LOW_RATED_REVIEW' | 'UNANSWERED_CHAT';

export type AttentionSeverity = 'HIGH' | 'MEDIUM';

export interface AttentionItem {
  id: string;                         // `${category}-${sourceId}`
  category: AttentionCategory;
  severity: AttentionSeverity;
  titleKey: string;                   // i18n key
  titleParams?: Record<string, string | number>;
  subtitle: string;                   // pre-formatted locale string
  occurredAt: Date;
  sourceId: number;
  navigateTo: string;                 // Expo Router href
}
```

### Hook Design

```typescript
// hooks/useAttentionItems.ts
export function useAttentionItems(): {
  items: AttentionItem[];
  isLoading: boolean;
  isError: boolean;
  lastCheckedAt: Date | null;
  refetch: () => void;
}
```

**Internals**:
1. Calls `useGetCenterBookingsQuery({ page: 0, size: 50 }, { pollingInterval })` 
2. Calls `useGetReviewsQuery({ page: 0, size: 20 }, { pollingInterval })`
3. Calls `useGetConversationsQuery({ page: 0, size: 20 }, { pollingInterval })`
4. Reads `openingTime` / `closingTime` from cached `useGetMyCenterQuery` result
5. Reads current language from `useTranslation()` for locale-aware subtitles
6. `pollingInterval` = `useIsFocused() ? 60_000 : 0`
7. Derives and returns the combined, sorted `AttentionItem[]`

### Component Design

```
<AttentionPanel />
  ├── if isLoading && items.length === 0 → <ActivityIndicator />
  ├── if isError → <InlineErrorBanner onRetry={refetch} />
  ├── if items.length === 0 → <AllClearState lastCheckedAt={lastCheckedAt} />
  └── if items.length > 0 →
        <SectionHeader title={t('attention.title')} />
        {CATEGORY_ORDER.map(category => {
          const categoryItems = items.filter(i => i.category === category);
          if (!categoryItems.length) return null;
          return (
            <CategoryGroup key={category} category={category} items={categoryItems} />
          );
        })}
```

```
<AttentionItem />
  ├── <SeverityIndicator severity={item.severity} />  (colored left border or dot)
  ├── <View>
  │     <AppText>{t(item.titleKey, item.titleParams)}</AppText>
  │     <AppText style="subtitle">{item.subtitle}</AppText>
  │   </View>
  ├── <TimeAgo date={item.occurredAt} />
  └── <ChevronRight />
  Wrapped in <TouchableOpacity onPress={() => router.push(item.navigateTo)} />
```

### i18n Keys

```json
// en.json additions under "attention":
{
  "attention": {
    "title": "Attention Required",
    "allClear": "All clear",
    "allClearSubtitle": "Last checked {{time}}",
    "retry": "Retry",
    "errorMessage": "Could not load attention items",
    "seeAll": "See all ({{count}})",
    "unassigned": "Unassigned",
    "categories": {
      "OVERDUE_BOOKING": "Overdue Bookings",
      "STALLED_BOOKING": "Stalled Bookings",
      "UNASSIGNED_BOOKING": "Unassigned Bookings",
      "LOW_RATED_REVIEW": "Low-Rated Reviews",
      "UNANSWERED_CHAT": "Unanswered Chats"
    },
    "severity": {
      "HIGH": "High",
      "MEDIUM": "Medium"
    },
    "bookingTitle": "Booking #{{id}}",
    "overdue": {
      "subtitle": "{{duration}} overdue · {{assignedTo}}"
    },
    "stalled": {
      "subtitle": "Stalled {{duration}} · {{assignedTo}}"
    },
    "unassignedBooking": {
      "subtitle": "Starts in {{timeUntil}} · No technician assigned"
    },
    "review": {
      "subtitle": "{{rating}}★ · {{time}}"
    },
    "chat": {
      "subtitle": "{{time}} · {{count}} unread"
    }
  }
}
```

Arabic equivalents added to `ar.json` in parallel.

### API Contracts

See `contracts/api-consumption.md`. Summary:
- 3 existing endpoints consumed, no new endpoints needed
- Business hours from `useGetMyCenterQuery` (already cached by dashboard)
- Polling: `pollingInterval = isFocused ? 60_000 : 0`

---

## Post-Design Constitution Re-Check

No violations found. The design:
- Uses only existing RTK Query patterns ✅
- All strings are i18n keys ✅
- Components are small and independently testable ✅
- No new backend endpoints ✅
- No feature flags or placeholder UI ✅
- AttentionPanel wraps its own error state; parent dashboard is not affected ✅

---

## Implementation Order (for `/speckit.tasks`)

The following task sequence is recommended:

1. **Types** — Create `types/attention.ts` with `AttentionCategory`, `AttentionSeverity`, `AttentionItem` interfaces
2. **i18n** — Add all `attention.*` keys to `en.json` and `ar.json`
3. **Hook** — Create `hooks/useAttentionItems.ts` with all derivation logic and polling
4. **AllClearState component** — Simplest UI component; good to build first for empty state testing
5. **AttentionItem component** — Single row with severity indicator, title, subtitle, time, chevron
6. **AttentionPanel component** — Container that wires the hook to the UI states (loading, error, items, all-clear)
7. **Dashboard integration** — Add `<AttentionPanel />` to `app/(app)/(tabs)/index.tsx`
8. **RTL spot-check** — Test in Arabic; verify layout mirrors correctly
9. **Pull-to-refresh** — Verify `refetch` from the hook is wired to the parent `RefreshControl`
10. **Smoke test** — Follow quickstart.md test cases for all five active categories

**Blocked tasks** (Phase 4.0 dependency):
- `PENDING_QUOTE` category derivation — requires `/bookings/{id}/quotes` endpoint

---

## Complexity Tracking

No constitution violations. No complexity justification required.
