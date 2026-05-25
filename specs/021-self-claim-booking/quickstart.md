# Quickstart: Self-Claim Booking

**Feature**: 021-self-claim-booking  
**Date**: 2026-05-25

---

## Prerequisites

1. Backend running: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`  
   (requires Docker Compose: `docker-compose up -d`)
2. App running: `npx expo start --web`
3. Spec 020 (Center Departments) deployed — `department` table and `department_memberships` table must exist
4. At least one center with departments seeded and at least one TECHNICIAN membership assigned to a department

---

## Test Data Setup

```sql
-- Verify departments exist
SELECT id, name_en, is_active FROM department WHERE center_id = <your_center_id>;

-- Verify technician membership assigned to a department
SELECT cm.id, u.firstname, u.lastname, d.name_en
FROM center_membership cm
JOIN _user u ON cm.user_id = u.id
JOIN department_memberships dm ON dm.membership_id = cm.id
JOIN department d ON d.id = dm.department_id
WHERE cm.role = 'TECHNICIAN' AND cm.status = 'ACTIVE';

-- Verify unassigned CONFIRMED bookings exist in that department
SELECT id, booking_status, department_id, assigned_membership_id
FROM booking
WHERE department_id = <dept_id>
  AND booking_status IN ('CONFIRMED', 'RESCHEDULED')
  AND assigned_membership_id IS NULL;
```

---

## Scenario 1: Happy Path (§8.1)

1. Log in as a TECHNICIAN assigned to "Engine Repair" department.
2. Navigate to Bookings → Department Queue tab.
3. Verify: queue shows unassigned CONFIRMED/RESCHEDULED bookings with department label.
4. Tap a booking → detail screen opens.
5. Verify: green "Claim Booking" button is visible (CLAIM_BOOKING permission gate).
6. Tap "Claim Booking" → confirm dialog appears.
7. Confirm → booking is assigned to this technician.
8. Navigate back to queue → booking no longer appears.
9. Check DB:
   ```sql
   SELECT assigned_membership_id FROM booking WHERE id = <booking_id>;
   -- Should be your membership ID

   SELECT * FROM booking_claim_audit WHERE booking_id = <booking_id>;
   -- Should have one row with membership_id, user_id, department_id, claimed_at
   ```

---

## Scenario 2: Concurrent Claim — Exactly One Wins (§8.2, NFR-SC-003)

Use two terminals or two browser tabs logged in as two different TECHNICIAN accounts in the same department.

Manual test (approximate concurrency):
1. Both technicians open the same booking detail screen.
2. Both tap "Claim" within 1–2 seconds of each other.
3. **Expected**: One sees "Booking claimed successfully". The other sees "This booking was just claimed by another technician."
4. Verify DB:
   ```sql
   SELECT COUNT(*) FROM booking_claim_audit WHERE booking_id = <booking_id>;
   -- Must be exactly 1
   SELECT assigned_membership_id FROM booking WHERE id = <booking_id>;
   -- Must be exactly one membership_id (not two, not null)
   ```

Load test (NFR-SC-003 requirement — 20 simultaneous requests, 1000 runs):
```bash
# Using ab (Apache Bench) or httpie
# Requires a valid JWT token for a TECHNICIAN
TOKEN="eyJ..."
for i in {1..20}; do
  curl -s -X POST http://localhost:8080/api/v1/bookings/<booking_id>/claim \
    -H "Authorization: Bearer $TOKEN" &
done
wait
# Check audit table — must have exactly 1 row per booking_id
```

---

## Scenario 3: Cross-Department Claim Rejected (§8.3)

1. Log in as TECHNICIAN assigned only to "Engine Repair".
2. Find a booking in "Body Shop" department:
   ```sql
   SELECT id FROM booking WHERE department_id = <body_shop_dept_id>
     AND booking_status = 'CONFIRMED' AND assigned_membership_id IS NULL;
   ```
3. Call the claim API directly (this booking does not appear in the technician's queue):
   ```bash
   curl -X POST http://localhost:8080/api/v1/bookings/<booking_id>/claim \
     -H "Authorization: Bearer $TOKEN"
   # Expected: 409 with businessErrorCode: "WRONG_DEPARTMENT"
   ```

---

## Scenario 4: Empty Queue — No Department Assignments (§8.6)

1. Create a TECHNICIAN account with no department assignments.
2. Log in as that technician.
3. Navigate to Bookings → Department Queue.
4. **Expected**: "You are not assigned to any department. Contact your branch manager to be added." message (not generic empty state).
5. Verify API:
   ```bash
   curl http://localhost:8080/api/v1/bookings/queue \
     -H "Authorization: Bearer $TOKEN_NO_DEPT"
   # Expected: content: [], noDepartmentMembership: true
   ```

---

## Scenario 5: 30-Second Auto-Refresh (spec §5.3)

1. Open the queue screen as Technician A.
2. In a separate session (Technician B or via API), claim the top booking.
3. Wait up to 30 seconds without touching the screen.
4. **Expected**: The claimed booking disappears from Technician A's queue automatically (no manual pull-to-refresh needed).

---

## Audit Trail Verification (FR-SC-011, FR-SC-012)

After any successful claim:
```sql
-- Audit record must exist and be immutable
SELECT id, booking_id, membership_id, user_id, department_id, claimed_at
FROM booking_claim_audit
WHERE booking_id = <booking_id>
ORDER BY claimed_at;

-- Even if manager reassigns, original audit row must remain
-- (claim row + reassignment row both present)
```

---

## RTL Smoke Test

1. Switch app language to Arabic (Settings → Language → Arabic).
2. Navigate to the queue — verify department labels show Arabic names.
3. Open a booking detail — verify "استلام الحجز" (Claim Booking) button label.
4. Trigger a `WRONG_DEPARTMENT` error — verify Arabic error message: "هذا الحجز ينتمي لقسم مختلف."
5. Verify RTL layout (text right-aligned, icons flipped).

---

## Type-Check

```bash
cd maintenance-center-app
npx tsc --noEmit
# Must pass with 0 errors after the three frontend patches
```
