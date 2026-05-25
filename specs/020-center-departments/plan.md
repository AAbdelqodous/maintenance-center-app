# Implementation Plan: Center Departments

**Branch**: `020-center-departments` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/020-center-departments/spec.md`

---

## Summary

Add a center-scoped Department entity that groups technician memberships by work type and routes incoming bookings to the right team via ServiceCategory matching. Departments are independent of the platform-wide ServiceCategory taxonomy — an owner names and configures them freely. A default "General / عام" department is seeded at center creation and for all existing centers on first deploy. Technician memberships are assigned to one or more departments (many-to-many); bookings receive a department FK at creation time. This is the routing and accountability prerequisite for self-claim (spec 021).

---

## Technical Context

**Language/Version**: TypeScript (React Native 0.81.5, Expo SDK 54) — frontend; Java 17, Spring Boot 3.5.6 — backend  
**Primary Dependencies**: RTK Query + Redux Toolkit (frontend state/API); Spring Data JPA + Hibernate (backend ORM); Expo Router (file-based navigation)  
**Storage**: PostgreSQL 15 (backend); RTK Query cache (frontend)  
**Testing**: `tsc --noEmit` type-checking (frontend); Spring Boot test slice (backend)  
**Target Platform**: iOS, Android, Web (react-native-web)  
**Project Type**: Mobile app (frontend) + REST API extension (backend)  
**Performance Goals**: Department routing adds <20ms p95 to booking creation; department list <200ms p95; membership department changes reflected within one RTK Query polling cycle  
**Constraints**: All user-facing strings bilingual (Ar/En); RTL layout required; JWTs in SecureStore; all API calls center-scoped via JWT identity  
**Scale/Scope**: 1–20 departments per center; up to 50 active memberships per center; Kuwait-primary market

---

## Constitution Check

*Gate: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven | ✅ Pass | spec.md exists and is approved |
| II. Bilingual First | ✅ Pass | Spec FR-D-018/019 require nameAr + nameEn. All UI strings via i18n keys. RTL layouts required for new screens. |
| III. Component-Driven UI | ✅ Pass | Plan delivers DepartmentCard, DepartmentForm, CategoryPicker as independent components. Screens compose them. |
| IV. API Contract Adherence | ✅ Pass | All data via RTK Query endpoints. JWT auth header. BusinessErrorCode for validation errors. |
| V. Owner-Context Awareness | ✅ Pass | All department endpoints are center-scoped (`centers/my/departments`). OWNER and BRANCH_MANAGER only for write operations. |
| VI. Security & Privacy | ✅ Pass | JWTs in SecureStore. Department data center-scoped — a staff member from center A cannot read center B's departments. |
| VII. Production Readiness | ✅ Pass | No feature flags. Error boundaries wrap all new screens. No placeholder UI. |

**No violations.** Proceed to Phase 0.

---

## Project Structure

### Documentation (this feature)

```text
specs/020-center-departments/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── departments-api.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (created by /speckit.tasks)
```

### Source Code

This feature touches two repos. Files listed are additions or extensions — no existing file is deleted.

**Frontend (`maintenance-center-app/`)**

```text
types/
└── department.ts                       ← NEW: Department, CreateDepartmentRequest, UpdateDepartmentRequest

store/api/
└── departmentsApi.ts                   ← NEW: RTK Query slice (createApi, same pattern as staffApi.ts)

store/
└── index.ts                            ← EXTEND: register departmentsApi reducer + middleware

app/(app)/(tabs)/staff/
└── departments/
    ├── index.tsx                        ← NEW: DepartmentListScreen (owner/BM only)
    ├── add.tsx                          ← NEW: AddDepartmentScreen (3-field form)
    └── [id].tsx                         ← NEW: EditDepartmentScreen (rename, categories, members, deactivate)

components/departments/
├── DepartmentCard.tsx                  ← NEW: name (locale), category chips, member count, active state
├── DepartmentForm.tsx                  ← NEW: nameAr, nameEn, CategoryPicker — used in add + edit
└── CategoryPicker.tsx                  ← NEW: multi-select from GET /categories

lib/i18n/locales/
├── en.json                             ← EXTEND: department.* keys (see contracts/departments-api.md §i18n)
└── ar.json                             ← EXTEND: same keys in Arabic
```

**Backend (`service-center/`)**

```text
src/main/java/com/maintainance/service_center/
└── department/
    ├── Department.java                 ← NEW: @Entity, id, center FK, nameAr, nameEn, displayOrder, isActive
    ├── DepartmentRequest.java          ← NEW: request DTO (nameAr, nameEn, categoryIds, displayOrder)
    ├── DepartmentResponse.java         ← NEW: response DTO (id, centerId, nameAr, nameEn, isActive, categories[])
    ├── DepartmentRepository.java       ← NEW: JPA repo with center-scoped finders
    ├── DepartmentService.java          ← NEW: create, update, deactivate, seed, routing logic
    └── DepartmentController.java       ← NEW: REST controller under /centers/my/departments

booking/
├── Booking.java                        ← EXTEND: add @ManyToOne Department department FK (nullable for legacy)
└── BookingService.java                 ← EXTEND: create() calls DepartmentService.resolveForCategory()

db/migration/ (Flyway)
├── V{n}__create_department_tables.sql  ← NEW: department, department_categories, department_memberships tables
└── V{n+1}__seed_general_departments.sql  ← NEW: one General dept per center; assign all memberships + bookings
```

**Structure Decision**: Frontend follows the established `createApi` per-domain pattern (same as `staffApi.ts`). Department screens live under `app/(app)/(tabs)/staff/departments/` because department management is an owner/BM staff-administration function. Backend follows the existing domain package pattern (one package per entity group).

---

## Complexity Tracking

No constitution violations — this section left intentionally empty.
