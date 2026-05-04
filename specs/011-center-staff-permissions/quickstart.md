# Quickstart & Smoke Test: Center Staff & Permissions

**Branch**: `011-center-staff-permissions` | **Date**: 2026-04-27

---

## Prerequisites

1. Backend running on `http://localhost:8080/api/v1/` with Flyway migrations applied (all V011_* scripts)
2. `npx expo start --web` running on `http://localhost:8081`
3. MailDev UI open at `http://localhost:1080` (to inspect invitation emails)
4. Two test accounts ready:
   - **Owner**: an `APPROVED` `OWNER` with at least one active center
   - **Invitee**: a `CUSTOMER` account (or a fresh email for a new-user flow)

---

## Setup Check — Migration Backfill

After running Flyway migrations, verify the backfill ran:

```sql
-- Should return one ACTIVE OWNER row per center for each OWNER
SELECT cm.user_id, cm.center_id, cm.role, cm.status
FROM center_membership cm
WHERE cm.role = 'OWNER' AND cm.status = 'ACTIVE';
```

Expected: one row per (`owner_id`, `center_id`) pair in `maintenance_centers`.

---

## Smoke Test Checklist

### ST-01: Owner logs in, sees no change

- [ ] Log in as the Owner account
- [ ] Confirm you reach the dashboard (center selector appears if >1 center, skips if 1)
- [ ] Confirm all tabs (Bookings, Chat, Reviews, Notifications, Profile) work as before

---

### ST-02: Owner opens Staff tab

- [ ] Navigate to the Staff tab (new bottom tab or settings entry)
- [ ] Staff list shows only the Owner row (yourself), with role "Owner" / "مالك" and status "Active"
- [ ] "Invite Staff" button is visible

---

### ST-03: Owner invites a Technician (happy path)

- [ ] Tap "Invite Staff"
- [ ] Enter the invitee's email, select role "Technician"
- [ ] Tap "Send Invitation"
- [ ] Success toast: "Invitation sent successfully" / "تم إرسال الدعوة بنجاح"
- [ ] Staff list now shows the invitee with status "Invited"
- [ ] MailDev shows a new invitation email addressed to the invitee
- [ ] Email contains a deep link with a token parameter

---

### ST-04: Invitee accepts (existing account)

- [ ] Open the invitation link while signed in as the invitee (CUSTOMER account)
- [ ] Accept Invite screen shows center name, role, and inviter name
- [ ] Tap "Accept"
- [ ] App switches to center owner view; center selector shows if >1 membership
- [ ] Invitee's membership status in the Owner's Staff list changes to "Active"

---

### ST-05: Technician sees only assigned bookings

- [ ] Log in as the Technician
- [ ] Select the center
- [ ] Open Bookings tab
- [ ] Confirm only bookings explicitly assigned to this technician are visible
- [ ] Financial columns (`final_amount`, `quoted_amount`) are not shown

---

### ST-06: Permission gate — Technician cannot access Chat

- [ ] As Technician, attempt to open the Chat tab
- [ ] Chat tab is either hidden or shows "You don't have permission to access this section"
- [ ] No API call to `/conversations/center` is made

---

### ST-07: Owner removes Technician

- [ ] As Owner, open the Technician's member detail
- [ ] Tap "Remove"
- [ ] Confirm dialog shown
- [ ] Staff list updates — Technician row shows status "Removed"
- [ ] If the Technician session is still open: within 60 seconds, their next API call returns `403` and they are logged out of the center context

---

### ST-08: Owner cannot remove themselves

- [ ] As Owner, open your own member detail
- [ ] "Remove" button is absent OR tapping it shows "Owners cannot remove themselves"

---

### ST-09: Self-leave

- [ ] Log in as an active Technician
- [ ] Find "Leave center" in staff settings or profile
- [ ] Confirm leave action
- [ ] App redirects to login or "no center access" screen
- [ ] Owner's Staff list shows the Technician's status as "Removed"

---

### ST-10: Invitation expiry

- [ ] In the DB, manually set `expires_at` to a past timestamp for a `PENDING` invitation
- [ ] Open the invitation link
- [ ] "Invitation expired" screen is shown
- [ ] Owner's staff list shows status "Invitation Expired" with a "Re-send" option

---

### ST-11: Staff cap enforcement

- [ ] Ensure the center has 50 active + invited members (or temporarily lower the cap in config)
- [ ] Attempt to send one more invitation
- [ ] Error: "Maximum staff limit reached (50). Remove a member before inviting."

---

### ST-12: Branch Manager cannot invite Branch Manager

- [ ] Log in as an active Branch Manager
- [ ] Open "Invite Staff"
- [ ] Select role "Branch Manager"
- [ ] Confirm the form validation or API returns a permission error
- [ ] The "Branch Manager" role option is either absent or blocked

---

### ST-13: Bilingual display

- [ ] Switch app language to Arabic
- [ ] Open Staff list
- [ ] Role labels display in Arabic (مالك / مدير الفرع / موظف استقبال / فني / محاسب)
- [ ] Status labels display in Arabic
- [ ] Layout is right-to-left

---

## Backend Endpoint Quick-Test (curl)

```bash
# Get staff list (Owner token)
curl -H "Authorization: Bearer $OWNER_TOKEN" \
  http://localhost:8080/api/v1/centers/my/staff

# Invite a technician
curl -X POST -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetEmail":"tech@example.com","targetRole":"TECHNICIAN"}' \
  http://localhost:8080/api/v1/centers/my/staff/invite

# Get memberships for logged-in user
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/users/me/memberships

# Accept invitation
curl -X POST -H "Authorization: Bearer $INVITEE_TOKEN" \
  http://localhost:8080/api/v1/invitations/$TOKEN/accept
```
