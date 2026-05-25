# Data Model: Center Departments

**Feature**: 020-center-departments  
**Phase**: Phase 1 — Design  
**Date**: 2026-05-24

---

## Backend Entities

### Department

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Long | PK, auto-increment | |
| `center` | MaintenanceCenter (FK) | NOT NULL | Owning center; cascade delete if center deleted |
| `nameAr` | String (200) | NOT NULL | Arabic name; unique per center |
| `nameEn` | String (200) | NOT NULL | English name; unique per center |
| `displayOrder` | Integer | NOT NULL, default 0 | Lower = higher priority for tie-breaking in routing (FR-D-009) |
| `isActive` | Boolean | NOT NULL, default true | Soft delete flag (FR-D-004) |
| `createdAt` | LocalDateTime | NOT NULL, immutable | `@CreatedDate` |
| `updatedAt` | LocalDateTime | nullable | `@LastModifiedDate` |

**Uniqueness constraints** (DB-level):
- `UNIQUE(center_id, name_ar)` — enforces FR-D-005 for Arabic
- `UNIQUE(center_id, name_en)` — enforces FR-D-005 for English
Both constraints filter on `is_active = true` (partial unique index in PostgreSQL).

**State transitions**:
```
ACTIVE (isActive=true) ──[deactivate]──> INACTIVE (isActive=false)
INACTIVE ──[no re-activation supported in v1]──> INACTIVE
```
Note: spec does not require re-activation in v1; if added later it is a single field update with the same validation as creation.

---

### department_categories (join table)

| Column | Type | Constraints |
|---|---|---|
| `department_id` | Long | FK → department.id, NOT NULL |
| `category_id` | Long | FK → service_categories.id, NOT NULL |

**Composite PK**: `(department_id, category_id)`

No additional columns — the relationship has no properties. Deleting a department deletes its category rows via cascade.

---

### department_memberships (join table)

| Column | Type | Constraints |
|---|---|---|
| `department_id` | Long | FK → department.id, NOT NULL |
| `membership_id` | Long | FK → center_membership.id, NOT NULL |

**Composite PK**: `(department_id, membership_id)`

Managed by `DepartmentService`. Deleting a membership (staff removal) cascades to remove its department_memberships rows. Deactivating a department does NOT cascade to memberships — the spec requires blocking deactivation while active members exist (FR-D-003), so this state is prevented by application logic, not cascade.

---

### Booking (extension)

One new column added to the existing `booking` table:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `department_id` | Long | FK → department.id, nullable | Nullable for pre-migration legacy rows only. Set at booking creation from v{n+1} deploy onward. |

Application fallback: when `department_id IS NULL`, the booking is treated as belonging to the center's default (General) department at query time. After the seeding migration runs, this should be zero rows in production.

---

## Frontend Types (`types/department.ts`)

```typescript
export interface Department {
  id: number;
  centerId: number;
  nameAr: string;
  nameEn: string;
  displayOrder: number;
  isActive: boolean;
  categoryIds: number[];
  memberCount: number;          // included in list response for display; omit in write requests
}

export interface CreateDepartmentRequest {
  nameAr: string;
  nameEn: string;
  categoryIds?: number[];       // optional; empty = "all / none configured"
  displayOrder?: number;        // optional; server assigns next available if omitted
}

export interface UpdateDepartmentRequest {
  nameAr?: string;
  nameEn?: string;
  categoryIds?: number[];
  displayOrder?: number;
}

export interface DepartmentMembershipUpdate {
  membershipId: number;
}
```

**i18n display helper** (not a stored type — for component use):
```typescript
// In components, pick name by locale:
const name = i18n.language === 'ar' ? dept.nameAr : dept.nameEn;
```

---

## Response DTOs (backend → frontend)

### DepartmentResponse

```json
{
  "id": 3,
  "centerId": 5,
  "nameAr": "ورشة المحرك",
  "nameEn": "Engine Repair",
  "displayOrder": 1,
  "isActive": true,
  "categoryIds": [1, 4],
  "memberCount": 3
}
```

### DepartmentListResponse

The list endpoint returns a flat array (not paginated — departments per center are small):
```json
[
  { "id": 1, "nameAr": "عام", "nameEn": "General", "displayOrder": 0, "isActive": true, "categoryIds": [], "memberCount": 5 },
  { "id": 3, "nameAr": "ورشة المحرك", "nameEn": "Engine Repair", "displayOrder": 1, "isActive": true, "categoryIds": [1], "memberCount": 3 }
]
```

Active departments are returned before inactive ones; within each group, ordered by `displayOrder` ascending.

---

## Routing Logic (conceptual)

When `BookingService.create()` is called:

```
1. Resolve ServiceCategory from the booking request (already done in existing code)
2. Call DepartmentService.resolveForCategory(center, category):
   a. Find all active departments for the center that include this category
      → SELECT d FROM Department d JOIN d.categories c
         WHERE d.center = :center AND d.isActive = true AND c.id = :categoryId
         ORDER BY d.displayOrder ASC
   b. If result is non-empty: return first result (lowest displayOrder wins)
   c. If result is empty: return center's default department
      → SELECT d FROM Department d WHERE d.center = :center AND d.isActive = true
         ORDER BY d.displayOrder ASC LIMIT 1
         (first department = oldest / lowest order = General by convention)
3. Set booking.department = resolvedDepartment
```

**Default department fallback guarantee**: Every center always has at least one active department (FR-D-006). Step 2c therefore always finds a result.

---

## Validation Rules

| Rule | Entity | Enforcement |
|---|---|---|
| nameAr required, max 200 chars | Department | `@NotBlank @Size(max=200)` on request DTO |
| nameEn required, max 200 chars | Department | same |
| nameAr unique per center (active depts only) | Department | DB partial unique index + service-layer check for user-friendly error |
| nameEn unique per center (active depts only) | Department | same |
| Cannot deactivate if non-terminal bookings exist | Department | `DepartmentService.deactivate()` checks bookingRepository before setting isActive=false |
| Cannot deactivate if active members exist | Department | `DepartmentService.deactivate()` checks membershipRepository before setting isActive=false |
| Cannot deactivate last active department | Department | `DepartmentService.deactivate()` checks count of active depts for center > 1 |
| categoryIds must reference existing ServiceCategory IDs | Department | `DepartmentService` loads categories and validates each ID |

---

## Migration Plan

Two Flyway scripts, applied in sequence:

### V{n}: `create_department_tables`
```sql
-- department table
CREATE TABLE department (
  id BIGSERIAL PRIMARY KEY,
  center_id BIGINT NOT NULL REFERENCES maintenance_centers(id),
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

-- Partial unique indexes (active departments only)
CREATE UNIQUE INDEX uq_dept_name_ar_center
  ON department(center_id, name_ar) WHERE is_active = TRUE;
CREATE UNIQUE INDEX uq_dept_name_en_center
  ON department(center_id, name_en) WHERE is_active = TRUE;

-- Category join table
CREATE TABLE department_categories (
  department_id BIGINT NOT NULL REFERENCES department(id) ON DELETE CASCADE,
  category_id   BIGINT NOT NULL REFERENCES service_categories(id),
  PRIMARY KEY (department_id, category_id)
);

-- Membership join table
CREATE TABLE department_memberships (
  department_id BIGINT NOT NULL REFERENCES department(id) ON DELETE CASCADE,
  membership_id BIGINT NOT NULL REFERENCES center_membership(id) ON DELETE CASCADE,
  PRIMARY KEY (department_id, membership_id)
);

-- Booking extension
ALTER TABLE booking ADD COLUMN department_id BIGINT REFERENCES department(id);
```

### V{n+1}: `seed_general_departments`
```sql
-- Seed one General department per center that has none
INSERT INTO department (center_id, name_ar, name_en, display_order, is_active, created_at)
SELECT id, 'عام', 'General', 0, TRUE, NOW()
FROM maintenance_centers mc
WHERE NOT EXISTS (
  SELECT 1 FROM department d WHERE d.center_id = mc.id AND d.is_active = TRUE
);

-- Assign all active TECHNICIAN memberships to their center's General department
INSERT INTO department_memberships (department_id, membership_id)
SELECT d.id, cm.id
FROM center_membership cm
JOIN department d ON d.center_id = cm.center_id
  AND d.name_en = 'General' AND d.is_active = TRUE
WHERE cm.role = 'TECHNICIAN' AND cm.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM department_memberships dm
    WHERE dm.membership_id = cm.id AND dm.department_id = d.id
  );

-- Assign all non-terminal bookings to their center's General department
UPDATE booking b
SET department_id = d.id
FROM department d
WHERE d.center_id = b.center_id
  AND d.name_en = 'General' AND d.is_active = TRUE
  AND b.department_id IS NULL
  AND b.booking_status NOT IN ('COMPLETED', 'CANCELLED', 'NO_SHOW');
```

> **Migration note for backend session**: `center_membership` table name is assumed based on spec 011/015 design. Verify the actual table name before writing the migration script. The booking `center_id` column name should also be verified against the actual schema (`booking.center_id` vs joining via `MaintenanceCenter`).
