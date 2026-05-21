# Implementation Plan: Staff Management Foundation

**Branch**: `015-staff-management-foundation` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/015-staff-management-foundation/spec.md`

## Summary

Enable per-person accountability inside a maintenance center branch by wiring up booking assignment to specific technicians, locking staff booking views to assigned-only for Technicians, and hardening role-based navigation guards within the staff area. The staff roster management screens (invite, role-change, suspend/reinstate) are already built. The missing layer is the booking ↔ technician assignment link and the navigation differentiation between BRANCH_MANAGER, TECHNICIAN, and RECEPTIONIST roles.

## Technical Context

**Language/Version**: TypeScript 5.x (React Native 0.81.5 + Expo SDK 54)  
**Primary Dependencies**: Expo Router (file-based navigation), Redux Toolkit + RTK Query, React Hook Form + Zod, react-i18next, expo-secure-store  
**Storage**: Redux in-memory + expo-secure-store (session/centerId) + localStorage (web fallback)  
**Testing**: None currently enforced — manual smoke-test on web  
**Target Platform**: iOS, Android, Web (react-native-web)  
**Project Type**: Mobile app (React Native + Expo)  
**Performance Goals**: Booking list refresh < 1s on LTE; assignment write + tag invalidation updates list within one RTK Query poll cycle  
**Constraints**: RTL/LTR bilingual UI; web must use `window.confirm` not `Alert.alert` for destructive confirms; JWT stored in SecureStore, never AsyncStorage plain text  
**Scale/Scope**: Single-branch owner context per session; staff per branch expected < 50; bookings list paginated at 20/page

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. Spec-Driven | Spec written and approved; plan follows spec | ✅ PASS |
| II. Bilingual First | All new i18n keys have Ar + En variants; role labels delivered via i18n keys | ✅ PASS |
| III. Component-Driven UI | New TechnicianPicker wraps `FlatList`; existing `PermissionGate` used for conditional render | ✅ PASS |
| IV. API Contract Adherence | Two new RTK Query mutations + one new query; error handling via existing `businessErrorDescription` pattern | ✅ PASS |
| V. Owner-Context Awareness | All new screens are operational: booking assignment, staff management, not customer-facing | ✅ PASS |
| VI. Security & Privacy | JWT from SecureStore; ASSIGN_TECHNICIAN permission gate on client; cross-branch rejection enforced by backend | ✅ PASS |
| VII. Production Readiness | No placeholders; error boundaries wrap screen-level components; bilingual error messages | ✅ PASS |

**Re-check post-design**: All gates still pass after Phase 1 design — no new complexity added.

## Project Structure

### Documentation (this feature)

```text
specs/015-staff-management-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── booking-assignment.md
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (affected paths)

```text
store/api/
├── bookingsApi.ts           # MODIFY: add assignTechnician mutation, extend Booking type
├── staffApi.ts              # MODIFY: add getMyAssignedBookings query

types/
└── staff.ts                 # ALREADY COMPLETE — no changes needed

components/
├── bookings/
│   ├── BookingCard.tsx      # MODIFY: add optional assignedTo display row
│   └── TechnicianPicker.tsx # NEW: modal picker for active technicians
└── staff/
    └── PermissionGate.tsx   # ALREADY COMPLETE — no changes needed

app/(app)/
├── _layout.tsx              # MODIFY: add intra-staff role guard (BRANCH_MANAGER vs TECHNICIAN/RECEPTIONIST)
├── staff/
│   ├── _layout.tsx          # MODIFY: add role-aware tab bar (hide "Staff List" tab for non-managers)
│   ├── dashboard.tsx        # ALREADY COMPLETE
│   ├── bookings/
│   │   ├── index.tsx        # MODIFY: switch to getMyAssignedBookings for TECHNICIAN role
│   │   └── [id].tsx         # MODIFY: add "Assign Technician" section (PermissionGate: ASSIGN_TECHNICIAN)
│   ├── reviews.tsx          # ALREADY COMPLETE
│   ├── notifications.tsx    # ALREADY COMPLETE
│   └── profile.tsx          # ALREADY COMPLETE
└── (tabs)/
    └── bookings/
        └── [id].tsx         # MODIFY: add "Assign Technician" section (PermissionGate: ASSIGN_TECHNICIAN)

lib/i18n/locales/
├── en.json                  # ADD: bookings.assignTechnician, bookings.assignedTo, bookings.unassigned,
│                            #      bookings.reassign, bookings.crossBranchError
└── ar.json                  # ADD: same keys in Arabic
```

## Complexity Tracking

No Constitution violations. No added complexity beyond feature scope.

---

## Phase 0: Research

See [research.md](./research.md) — all unknowns resolved.

## Phase 1: Design

### Data Model

See [data-model.md](./data-model.md)

### API Contracts

See [contracts/booking-assignment.md](./contracts/booking-assignment.md)

### Quickstart

See [quickstart.md](./quickstart.md)
