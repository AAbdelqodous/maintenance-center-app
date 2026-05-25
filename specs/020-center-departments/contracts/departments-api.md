# API Contract: Center Departments

**Feature**: 020-center-departments  
**Base path**: `/api/v1/centers/my/departments`  
**Auth**: All endpoints require `Authorization: Bearer <jwt>`. The calling user's center is
resolved server-side from their membership — no `centerId` parameter is accepted.  
**Permission gate**: Write endpoints (POST, PUT, DELETE) require `MANAGE_ALL_STAFF` or
`MANAGE_NON_MANAGER_STAFF` (i.e., OWNER or BRANCH_MANAGER). GET endpoints are available to
all active memberships.

---

## Endpoints

### GET /centers/my/departments

Returns all departments for the caller's active center, active first, ordered by `displayOrder` ascending within each group.

**Response**: `Department[]` (not paginated — max ~20 per center)

```json
[
  {
    "id": 1,
    "centerId": 5,
    "nameAr": "عام",
    "nameEn": "General",
    "displayOrder": 0,
    "isActive": true,
    "categoryIds": [],
    "memberCount": 5
  },
  {
    "id": 3,
    "centerId": 5,
    "nameAr": "ورشة المحرك",
    "nameEn": "Engine Repair",
    "displayOrder": 1,
    "isActive": true,
    "categoryIds": [1],
    "memberCount": 3
  }
]
```

---

### POST /centers/my/departments

Creates a new department for the caller's center.

**Request body**:
```json
{
  "nameAr": "ورشة الهيكل",
  "nameEn": "Body Shop",
  "categoryIds": [1, 2],
  "displayOrder": 2
}
```

| Field | Required | Notes |
|---|---|---|
| `nameAr` | Yes | Max 200 chars; must be unique (active depts) for this center |
| `nameEn` | Yes | Max 200 chars; must be unique (active depts) for this center |
| `categoryIds` | No | Array of existing ServiceCategory IDs; empty = no category coverage |
| `displayOrder` | No | Server assigns `MAX(displayOrder) + 1` if omitted |

**Success**: `201 Created` — body is the created `Department`

**Errors**:

| HTTP | businessErrorCode | Meaning |
|---|---|---|
| 400 | `DEPT_DUPLICATE_NAME_AR` | Arabic name already used by an active department at this center |
| 400 | `DEPT_DUPLICATE_NAME_EN` | English name already used by an active department at this center |
| 400 | `DEPT_INVALID_CATEGORY` | One or more `categoryIds` do not exist |
| 403 | (standard) | Caller lacks MANAGE_ALL_STAFF / MANAGE_NON_MANAGER_STAFF |

---

### PUT /centers/my/departments/{id}

Updates a department's name, category list, or display order. All fields are optional — only supplied fields are updated.

**Request body**:
```json
{
  "nameAr": "ورشة الكهرباء",
  "nameEn": "Electrical",
  "categoryIds": [1, 4],
  "displayOrder": 3
}
```

**Success**: `200 OK` — body is the updated `Department`

**Errors**:

| HTTP | businessErrorCode | Meaning |
|---|---|---|
| 400 | `DEPT_DUPLICATE_NAME_AR` | New Arabic name conflicts with another active department |
| 400 | `DEPT_DUPLICATE_NAME_EN` | New English name conflicts with another active department |
| 400 | `DEPT_INVALID_CATEGORY` | One or more `categoryIds` do not exist |
| 404 | (standard) | Department not found or does not belong to caller's center |

---

### DELETE /centers/my/departments/{id}

Soft-deactivates the department (sets `isActive = false`). Does not delete the row.

**Request body**: none

**Success**: `204 No Content`

**Errors**:

| HTTP | businessErrorCode | Meaning |
|---|---|---|
| 409 | `DEPT_HAS_OPEN_BOOKINGS` | Department has non-terminal bookings; reassign or complete first |
| 409 | `DEPT_HAS_ACTIVE_MEMBERS` | Department has active technician members; remove them first |
| 409 | `DEPT_LAST_ACTIVE` | This is the last active department; cannot deactivate |
| 404 | (standard) | Not found or not owned by caller's center |

---

### GET /centers/my/departments/{id}/members

Returns the active technician memberships assigned to a specific department.

**Response**: `CenterMembership[]` (same shape as `GET /centers/my/staff` items, filtered to this department)

```json
[
  {
    "id": 12,
    "userId": 44,
    "userFirstname": "Mohammed",
    "userLastname": "Al-Rashidi",
    "userEmail": "m.rashidi@example.com",
    "role": "TECHNICIAN",
    "roleAr": "فني",
    "roleEn": "Technician",
    "status": "ACTIVE",
    "centerId": 5
  }
]
```

---

### POST /centers/my/departments/{id}/members

Assigns an existing TECHNICIAN membership to this department.

**Request body**:
```json
{ "membershipId": 12 }
```

**Success**: `200 OK` — body is the updated `Department` (includes updated `memberCount`)

**Errors**:

| HTTP | businessErrorCode | Meaning |
|---|---|---|
| 400 | `DEPT_MEMBER_NOT_TECHNICIAN` | The membership's role is not TECHNICIAN |
| 400 | `DEPT_MEMBER_ALREADY_ASSIGNED` | Membership already assigned to this department (idempotent clients may ignore this) |
| 400 | `DEPT_MEMBER_WRONG_CENTER` | Membership does not belong to the caller's center |
| 404 | (standard) | Department or membership not found |

---

### DELETE /centers/my/departments/{id}/members/{membershipId}

Removes a technician from this department. The membership itself is not affected — only the department assignment.

**Success**: `204 No Content`

**Errors**:

| HTTP | businessErrorCode | Meaning |
|---|---|---|
| 404 | (standard) | Department or membership not found, or membership not assigned to this department |

---

## RTK Query Slice (`store/api/departmentsApi.ts`)

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/lib/constants/config';
import { RootState } from '../index';
import type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DepartmentMembershipUpdate,
} from '@/types/department';
import type { CenterMembership } from '@/types/staff';

export const departmentsApi = createApi({
  reducerPath: 'departmentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.session?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Department'],
  endpoints: (builder) => ({

    getDepartments: builder.query<Department[], void>({
      query: () => 'centers/my/departments',
      providesTags: ['Department'],
    }),

    createDepartment: builder.mutation<Department, CreateDepartmentRequest>({
      query: (body) => ({ url: 'centers/my/departments', method: 'POST', body }),
      invalidatesTags: ['Department'],
    }),

    updateDepartment: builder.mutation<Department, { id: number; body: UpdateDepartmentRequest }>({
      query: ({ id, body }) => ({ url: `centers/my/departments/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Department'],
    }),

    deactivateDepartment: builder.mutation<void, number>({
      query: (id) => ({ url: `centers/my/departments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Department'],
    }),

    getDepartmentMembers: builder.query<CenterMembership[], number>({
      query: (id) => `centers/my/departments/${id}/members`,
      providesTags: (_result, _error, id) => [{ type: 'Department', id }],
    }),

    addDepartmentMember: builder.mutation<Department, { departmentId: number; body: DepartmentMembershipUpdate }>({
      query: ({ departmentId, body }) => ({
        url: `centers/my/departments/${departmentId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        'Department',
        { type: 'Department', id: departmentId },
      ],
    }),

    removeDepartmentMember: builder.mutation<void, { departmentId: number; membershipId: number }>({
      query: ({ departmentId, membershipId }) => ({
        url: `centers/my/departments/${departmentId}/members/${membershipId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        'Department',
        { type: 'Department', id: departmentId },
      ],
    }),

  }),
});

export const {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeactivateDepartmentMutation,
  useGetDepartmentMembersQuery,
  useAddDepartmentMemberMutation,
  useRemoveDepartmentMemberMutation,
} = departmentsApi;
```

---

## i18n Key Set

Add to both `lib/i18n/locales/en.json` and `ar.json`:

**English (`en.json`)**:
```json
{
  "departments": {
    "title": "Departments",
    "add": "Add Department",
    "edit": "Edit Department",
    "nameAr": "Arabic Name",
    "nameEn": "English Name",
    "categories": "Service Categories",
    "categoriesHint": "Bookings in these categories will route to this department",
    "members": "Members",
    "memberCount_one": "{{count}} technician",
    "memberCount_other": "{{count}} technicians",
    "noMembers": "No technicians assigned",
    "deactivate": "Deactivate Department",
    "deactivateConfirm": "Deactivate this department? It will no longer appear in routing or the technician queue.",
    "deactivated": "Deactivated",
    "empty": "No departments yet. Add your first department to start routing bookings.",
    "addMember": "Add Technician",
    "removeMember": "Remove from Department",
    "removeMemberConfirm": "Remove this technician from the department?",
    "errors": {
      "duplicateNameAr": "A department with this Arabic name already exists.",
      "duplicateNameEn": "A department with this English name already exists.",
      "invalidCategory": "One or more selected categories are invalid.",
      "hasOpenBookings": "This department has open bookings. Reassign or complete them before deactivating.",
      "hasActiveMembers": "This department has active technicians. Remove them before deactivating.",
      "lastActive": "You must have at least one active department.",
      "memberNotTechnician": "Only technicians can be assigned to a department.",
      "memberWrongCenter": "This staff member does not belong to your center."
    },
    "saved": "Department saved.",
    "deactivateSuccess": "Department deactivated.",
    "memberAdded": "Technician added to department.",
    "memberRemoved": "Technician removed from department."
  }
}
```

**Arabic (`ar.json`)**:
```json
{
  "departments": {
    "title": "الأقسام",
    "add": "إضافة قسم",
    "edit": "تعديل القسم",
    "nameAr": "الاسم بالعربية",
    "nameEn": "الاسم بالإنجليزية",
    "categories": "فئات الخدمة",
    "categoriesHint": "ستُوجَّه الحجوزات في هذه الفئات إلى هذا القسم",
    "members": "الأعضاء",
    "memberCount_one": "فني واحد",
    "memberCount_other": "{{count}} فنيين",
    "noMembers": "لا يوجد فنيون معيّنون",
    "deactivate": "تعطيل القسم",
    "deactivateConfirm": "تعطيل هذا القسم؟ لن يظهر في التوجيه أو قائمة انتظار الفنيين بعد الآن.",
    "deactivated": "معطَّل",
    "empty": "لا توجد أقسام بعد. أضف أول قسم لك لبدء توجيه الحجوزات.",
    "addMember": "إضافة فني",
    "removeMember": "إزالة من القسم",
    "removeMemberConfirm": "إزالة هذا الفني من القسم؟",
    "errors": {
      "duplicateNameAr": "يوجد قسم بهذا الاسم العربي بالفعل.",
      "duplicateNameEn": "يوجد قسم بهذا الاسم الإنجليزي بالفعل.",
      "invalidCategory": "فئة واحدة أو أكثر من الفئات المختارة غير صالحة.",
      "hasOpenBookings": "يوجد حجوزات مفتوحة في هذا القسم. أعد التعيين أو أكمل الحجوزات قبل التعطيل.",
      "hasActiveMembers": "يوجد فنيون نشطون في هذا القسم. قم بإزالتهم قبل التعطيل.",
      "lastActive": "يجب أن يكون لديك قسم واحد نشط على الأقل.",
      "memberNotTechnician": "يمكن تعيين الفنيين فقط للأقسام.",
      "memberWrongCenter": "هذا الموظف لا ينتمي إلى مركزك."
    },
    "saved": "تم حفظ القسم.",
    "deactivateSuccess": "تم تعطيل القسم.",
    "memberAdded": "تم إضافة الفني إلى القسم.",
    "memberRemoved": "تم إزالة الفني من القسم."
  }
}
```

---

## businessErrorCode → i18n key map (frontend error handler)

```typescript
const DEPT_ERROR_MAP: Record<string, string> = {
  DEPT_DUPLICATE_NAME_AR:    'departments.errors.duplicateNameAr',
  DEPT_DUPLICATE_NAME_EN:    'departments.errors.duplicateNameEn',
  DEPT_INVALID_CATEGORY:     'departments.errors.invalidCategory',
  DEPT_HAS_OPEN_BOOKINGS:    'departments.errors.hasOpenBookings',
  DEPT_HAS_ACTIVE_MEMBERS:   'departments.errors.hasActiveMembers',
  DEPT_LAST_ACTIVE:          'departments.errors.lastActive',
  DEPT_MEMBER_NOT_TECHNICIAN:'departments.errors.memberNotTechnician',
  DEPT_MEMBER_ALREADY_ASSIGNED: undefined,    // silent / ignore (idempotent)
  DEPT_MEMBER_WRONG_CENTER:  'departments.errors.memberWrongCenter',
};
```
