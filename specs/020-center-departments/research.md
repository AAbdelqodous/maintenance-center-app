# Research: Center Departments

**Feature**: 020-center-departments  
**Phase**: Phase 0 — Research  
**Date**: 2026-05-24

All questions resolved by reading the existing codebase directly. No external research was required.

---

## Decision 1: RTK Query slice structure

**Question**: Should departments use a new `createApi` slice or be injected into an existing one?

**Decision**: New standalone `departmentsApi.ts` using `createApi`.

**Rationale**: Every existing domain (bookings, staff, reviews, chat, pricing, offers, analytics) has its own `createApi` instance with its own `reducerPath`. Injecting into an existing slice (e.g., `staffApi`) would couple two independent domains and create a non-obvious dependency. The project has not adopted the `baseApi + injectEndpoints` pattern — matching the existing convention is simpler and more maintainable.

**Alternatives considered**: `staffApi.injectEndpoints` — rejected; couples department lifecycle to staff lifecycle, breaks if staffApi is refactored.

---

## Decision 2: Backend routing hook into booking creation

**Question**: Where does the department-routing logic live — in `BookingService.create()` or in a separate service?

**Decision**: `DepartmentService` owns a `resolveForCategory(center, category)` method. `BookingService.create()` calls it after resolving the `ServiceCategory`.

**Rationale**: `BookingService.create()` already resolves `ServiceCategory` by line 89 (the `offering.getCategory()` call). At that point, `category` is a concrete `ServiceCategory` object. A single call to `DepartmentService.resolveForCategory(center, category)` returns the correct `Department` (or the default if none matches). This keeps the routing logic in the owning domain and makes `BookingService` a thin caller. Routing logic must not live in `BookingService` because it would create a reverse dependency (booking package depending on department package, which depends on booking for the booking FK).

**Alternatives considered**: Routing via `@EntityListener` on `Booking` — rejected; listeners cannot inject Spring beans cleanly and make the routing implicit and hard to test.

---

## Decision 3: Department–ServiceCategory join table vs embedded list

**Question**: Should department category coverage be a join table (`department_categories`) or a JSON column on `Department`?

**Decision**: Dedicated join table `department_categories(department_id, category_id)`.

**Rationale**: ServiceCategory is an entity with its own primary key. A join table maintains referential integrity and allows efficient queries in both directions (which departments cover a given category; which categories a department covers). JSON columns cannot be joined in JPQL queries, which would make the routing query (`SELECT d FROM Department d WHERE :categoryId IN d.categoryIds`) impossible without loading all departments into memory first. The category list per department is small (1–6 entries) — join table overhead is negligible.

**Alternatives considered**: JSON column — rejected; cannot query across it in JPA. `@ElementCollection` of Long — acceptable but loses referential integrity. Join table wins.

---

## Decision 4: department_memberships table vs FK on CenterMembership

**Question**: Should the technician–department link be a join table or a `departmentId` FK on `CenterMembership`?

**Decision**: Many-to-many join table `department_memberships(department_id, membership_id)`.

**Rationale**: Spec 020 FR-D-015 explicitly allows a technician to belong to zero or more departments. A single FK on `CenterMembership` supports exactly one department. A join table supports the many-to-many relationship without changing the `CenterMembership` entity's shape (which is spec 011 territory and has its own migration story).

**Alternatives considered**: Single FK on `CenterMembership` — rejected; contradicts FR-D-015 and the self-claim spec's combined-queue requirement. `@ElementCollection` of department IDs on `CenterMembership` — rejected for the same reason as Decision 3 (no referential integrity).

---

## Decision 5: Default department seeding strategy

**Question**: Flyway migration or application startup code?

**Decision**: Flyway SQL migration (`V{n+1}__seed_general_departments.sql`).

**Rationale**: Application startup code (e.g., `@PostConstruct` or `ApplicationRunner`) runs on every startup — a seeding script would re-run against centers that already have departments, requiring idempotency checks in Java. A Flyway migration runs exactly once per schema version, is inherently idempotent, and leaves a clear audit trail in the `flyway_schema_history` table. The seed SQL is straightforward: `INSERT INTO department ... SELECT id FROM maintenance_centers mc WHERE NOT EXISTS (SELECT 1 FROM department WHERE center_id = mc.id)`.

**Alternatives considered**: `@PostConstruct` in `DepartmentService` — rejected; runs on every deploy, requires manual idempotency logic.

---

## Decision 6: Deactivation vs hard-delete

**Question**: Should deactivating a department soft-delete (set `isActive = false`) or hard-delete the row?

**Decision**: Soft delete (`isActive = false`).

**Rationale**: Spec FR-D-004 requires deactivated departments to be retained for audit — historical bookings retain their department reference and show the name with a "(deactivated)" label. Hard-deleting the row would break these foreign key references. Soft delete also allows re-activation if an owner made a mistake.

**Alternatives considered**: Hard delete with department name copied to booking record — rejected; denormalizes data unnecessarily. Hard delete with nullable `department_name` on booking — rejected; same problem.

---

## Decision 7: Frontend navigation placement for department management

**Question**: Where do department management screens live in the tab/route structure?

**Decision**: `app/(app)/(tabs)/staff/departments/` — nested under the staff management section.

**Rationale**: Department management is an administrative action taken by OWNER or BRANCH_MANAGER, tightly coupled to staff management (assigning technicians to departments). The staff section already exists at `app/(app)/(tabs)/staff/`. Placing departments there is consistent and discoverable. It also avoids adding a new top-level tab for a feature that is accessed infrequently (set up once, rarely changed).

**Alternatives considered**: Top-level "Settings" tab — not yet built. Center profile section — profile is for public-facing center attributes; departments are internal operational structure.

---

## Decision 8: Booking.department FK nullability for legacy bookings

**Question**: Should `Booking.department` be non-nullable, or allow null for pre-migration bookings?

**Decision**: Nullable in the DB schema; the seeding migration populates it for all non-terminal legacy bookings. After migration, application logic treats a null `departmentId` as belonging to the General department at query time (fallback read path only — new bookings always get a department at creation).

**Rationale**: Making the column non-nullable requires the migration to be atomic: table alter + data backfill in a single transaction. For large centers this could lock the `booking` table during deploy. A two-step approach (add nullable column → backfill → add not-null constraint in a later migration) is safer. The application code handles null by treating it as General, so the transition period is invisible to users.

**Alternatives considered**: Non-nullable with default value at DB level — rejected; a DB default of a hardcoded ID breaks multi-center seeding. Non-nullable atomic migration — rejected; table lock risk on production deploy.
