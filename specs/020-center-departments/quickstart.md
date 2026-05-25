# Quickstart: Center Departments

**Feature**: 020-center-departments  
**Phase**: Phase 1 — Design  
**Date**: 2026-05-24

This guide gives an implementing developer everything needed to start work in under 10 minutes.

---

## What this feature adds

A center-scoped Department entity that:
1. Groups TECHNICIAN memberships by work type
2. Auto-routes incoming bookings to the right department via ServiceCategory matching
3. Scopes the technician's self-claim queue (see spec 021) to their department(s)

---

## Prerequisites

Before starting implementation:

- [ ] `specs/015-staff-management-foundation` is implemented — the `CenterMembership` entity
      and `center_membership` table must exist before department_memberships can reference it
- [ ] `specs/011-center-staff-permissions/spec-amendment.md` is read — the permission model
      governs which roles can call which endpoints
- [ ] Local PostgreSQL running (Docker: `docker-compose up -d`)
- [ ] Spring Boot backend running (`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`)
- [ ] Expo dev server running (`npx expo start --web`)

---

## Starting points by task area

### Backend: new Department package

Create `src/main/java/.../department/` with these files in this order:
1. `Department.java` — entity; columns match `data-model.md §Backend Entities`
2. `DepartmentRequest.java` — `@NotBlank nameAr`, `@NotBlank nameEn`, `categoryIds?`, `displayOrder?`
3. `DepartmentResponse.java` — mirrors the JSON shape in `contracts/departments-api.md`
4. `DepartmentRepository.java` — extend `JpaRepository<Department, Long>` with:
   - `findByCenterIdAndIsActiveTrue(Long centerId): List<Department>`
   - `findByCenterAndCategoriesContainingAndIsActiveTrue(center, category): List<Department>` (for routing)
5. `DepartmentService.java` — `create`, `update`, `deactivate`, `resolveForCategory`, `seed`
6. `DepartmentController.java` — maps to `@RequestMapping("centers/my/departments")`

### Backend: extend BookingService

In `BookingService.create()`, after line 89 (`category = offering.getCategory()`), add:
```java
Department department = departmentService.resolveForCategory(center, category);
// then set on booking builder
```

### Backend: Flyway migrations

Add two files under `src/main/resources/db/migration/`:
- `V{n}__create_department_tables.sql` — copy from `data-model.md §Migration Plan`
- `V{n+1}__seed_general_departments.sql` — copy from same section

Verify actual table names against existing migrations before copy-pasting:
```sql
-- Quick check: what tables exist?
\dt
```

### Frontend: new type file

Create `types/department.ts` — copy from `data-model.md §Frontend Types`.

### Frontend: new API slice

Create `store/api/departmentsApi.ts` — copy from `contracts/departments-api.md §RTK Query Slice`.

Then register in `store/index.ts`:
```typescript
// In configureStore:
reducer: {
  ...existingReducers,
  departmentsApi: departmentsApi.reducer,
},
middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware().concat(
    ...existingMiddleware,
    departmentsApi.middleware,
  ),
```

### Frontend: i18n keys

Add all keys from `contracts/departments-api.md §i18n Key Set` to both:
- `lib/i18n/locales/en.json`
- `lib/i18n/locales/ar.json`

### Frontend: screens

Create in this order (each depends on the previous):
1. `app/(app)/(tabs)/staff/departments/index.tsx` — `useGetDepartmentsQuery()`, renders `DepartmentCard` list
2. `app/(app)/(tabs)/staff/departments/add.tsx` — `useCreateDepartmentMutation()`, renders `DepartmentForm`
3. `app/(app)/(tabs)/staff/departments/[id].tsx` — `useUpdateDepartmentMutation()` + `useDeactivateDepartmentMutation()`, renders `DepartmentForm` + member list

### Frontend: components

Create in this order:
1. `components/departments/CategoryPicker.tsx` — multi-select from `useGetCategoriesQuery()`; used by DepartmentForm
2. `components/departments/DepartmentForm.tsx` — RHF form: nameAr, nameEn, CategoryPicker
3. `components/departments/DepartmentCard.tsx` — name (locale), category chips, memberCount badge

---

## Local testing without backend

The backend is not fully built for spec 011 yet. To test the frontend UI independently:

1. In `departmentsApi.ts`, temporarily override `baseQuery` to return mock data:

```typescript
// Mock override for local UI testing only — remove before merge
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const mockData: Department[] = [
  { id: 1, centerId: 5, nameAr: 'عام', nameEn: 'General', displayOrder: 0, isActive: true, categoryIds: [], memberCount: 3 },
  { id: 2, centerId: 5, nameAr: 'ورشة المحرك', nameEn: 'Engine Repair', displayOrder: 1, isActive: true, categoryIds: [1], memberCount: 2 },
];
```

2. Verify screens render correctly for:
   - Empty department list (empty state message)
   - Single department (General only)
   - Multi-department list with inactive entry
   - Arabic locale (RTL layout check)

---

## Acceptance checklist (before marking tasks done)

- [ ] `tsc --noEmit` passes — no TypeScript errors
- [ ] All department.* i18n keys present in both en.json and ar.json
- [ ] DepartmentListScreen: empty state renders when no departments
- [ ] DepartmentListScreen: inactive departments shown with "(Deactivated)" label
- [ ] AddDepartmentScreen: both nameAr and nameEn required; form rejects empty submission
- [ ] EditDepartmentScreen: deactivate button hidden if department is the last active one
- [ ] All error codes from `contracts/departments-api.md` surface a localized message
- [ ] RTL layout correct in both list and form screens (Arabic locale)
- [ ] `Platform.OS === 'web'` confirmation fallback used for deactivate confirm dialog
- [ ] Backend: `resolveForCategory` returns General department when no specific match
- [ ] Backend: concurrent deactivation attempts are safely handled (last-active check is transactional)
- [ ] Flyway migrations apply cleanly to a fresh DB and to an existing DB with data
