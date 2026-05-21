# Ethics Guardrail Test: Staff Performance Board (SC-004)

**Purpose**: Verify that TECHNICIAN-role sessions receive no sensitive peer performance data.  
**Requirement**: FR-023, FR-024, SC-004 from spec.md

## Test Steps

### Step 1 — Obtain a TECHNICIAN JWT

1. Log in to the backend using a test account with TECHNICIAN role at the target center.
2. Capture the `token` from the authentication response.

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email": "tech@test.com", "password": "testpass"}' \
  | jq '.token'
```

### Step 2 — Call the Staff Performance Board Endpoint

```bash
curl -s http://localhost:8080/api/v1/analytics/center/staff-performance \
  -H "Authorization: Bearer <TECHNICIAN_TOKEN>" \
  | jq .
```

### Step 3 — Assert Sensitive Fields Are Absent for Peers

For every item in `.staff[]` that is NOT the authenticated user (different `userId`):

| Field | Expected | Pass Condition |
|-------|----------|----------------|
| `tier` | ABSENT | Field is `null` or missing from JSON object |
| `isOverloaded` | ABSENT | Field is `null` or missing |
| `trendDirection` | ABSENT | Field is `null` or missing |
| `activeBookings` | ABSENT | Field is `null` or missing |
| `avgRatingThisMonth` | ABSENT | Field is `null` or missing |

Fields that ARE allowed for all viewers (including technicians):

| Field | Expected |
|-------|----------|
| `membershipId` | Present |
| `firstName` / `lastName` | Present |
| `status` | Present (`AVAILABLE`, `ON_TASK`, `OFFLINE` only — OVERLOADED must also be absent) |
| `activeBookingsCount` | Present (count is allowed; granular booking list is not) |
| `role` | Present |

> **Note**: The `status` field value `OVERLOADED` MUST also be stripped for technician sessions — return `ON_TASK` if the underlying status would be `OVERLOADED`.

### Step 4 — Assert Own Record Shows Permitted Fields

The staff card for the authenticated technician's own `userId` may show their own metrics (implementation detail; at minimum, no peer data leaks).

### Step 5 — Assert HTTP 403 for Drill-Down

```bash
curl -i http://localhost:8080/api/v1/analytics/center/staff/12/history \
  -H "Authorization: Bearer <TECHNICIAN_TOKEN>"
# Expected: HTTP/1.1 403 Forbidden
```

## Pass/Fail Status

| Check | Status |
|-------|--------|
| `tier` absent for peers | ⬜ Pending backend implementation |
| `isOverloaded` absent for peers | ⬜ Pending backend implementation |
| `trendDirection` absent for peers | ⬜ Pending backend implementation |
| `activeBookings` absent for peers | ⬜ Pending backend implementation |
| `OVERLOADED` status value absent for peers | ⬜ Pending backend implementation |
| `/history` endpoint returns 403 for TECHNICIAN | ⬜ Pending backend implementation |

## Notes

- These checks require the backend endpoints (T004–T006 in tasks.md) to be implemented first.
- All checks must pass before the feature is considered production-ready (SC-004).
- Update this checklist with actual pass/fail results once backend is available.
