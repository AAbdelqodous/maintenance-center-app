# Quickstart: Admin Panel — Center Owner Approval

**Branch**: `012-admin-panel`

---

## Prerequisites

- Docker running (`le-postgres` container up)
- Backend running with dev profile

```bash
docker-compose up -d
cd ~/IdeaProjects/life-experience-app/service-center
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

---

## 1. Verify admin account seeded on startup

Check the log for:
```
INFO  DataInitializer - Seeded ROLE_ADMIN role
INFO  DataInitializer - Created default admin user: admin@experience.com
```

Or query the DB:
```sql
SELECT email, user_type, enabled FROM _user WHERE user_type = 'ADMIN';
```

---

## 2. Get admin JWT

```bash
curl -X POST http://localhost:8080/api/v1/auth/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@experience.com","password":"Admin@12345"}'
```

Expected: `{"token":"<jwt>","approvalStatus":null}`

Copy the token for the steps below.

---

## 3. Register a CENTER_OWNER (trigger the approval flow)

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstname":"Fahd",
    "lastname":"Almutairi",
    "email":"fahd@test.com",
    "password":"Test@12345",
    "userType":"CENTER_OWNER"
  }'
```

Expected: `202 Accepted`. Check MailDev at http://localhost:1080 for the OTP email.
Activate the account, then verify in DB:

```sql
SELECT id, email, approval_status FROM _user WHERE email = 'fahd@test.com';
-- approval_status should be PENDING_APPROVAL
```

---

## 4. CENTER_OWNER login returns PENDING_APPROVAL

```bash
curl -X POST http://localhost:8080/api/v1/auth/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"fahd@test.com","password":"Test@12345"}'
```

Expected: `{"token":"...","approvalStatus":"PENDING_APPROVAL"}`

---

## 5. Admin lists pending registrations

```bash
curl http://localhost:8080/api/v1/admin/users/pending \
  -H "Authorization: Bearer <admin-jwt>"
```

Expected: page with Fahd's record. Note his `id`.

---

## 6. Admin approves the owner

```bash
curl -X PUT http://localhost:8080/api/v1/admin/users/10/approve \
  -H "Authorization: Bearer <admin-jwt>"
```

Expected: `{"id":10,...,"approvalStatus":"APPROVED"}`

---

## 7. Verify approved owner can now login normally

```bash
curl -X POST http://localhost:8080/api/v1/auth/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"fahd@test.com","password":"Test@12345"}'
```

Expected: `{"token":"...","approvalStatus":"APPROVED"}`

---

## 8. Test rejection flow

```bash
# Register and activate another owner (e.g. bad@test.com), then:
curl -X PUT http://localhost:8080/api/v1/admin/users/{id}/reject \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Incomplete documents"}'

# Attempt login as rejected owner:
curl -X POST http://localhost:8080/api/v1/auth/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"bad@test.com","password":"Test@12345"}'
```

Expected: `403 Forbidden` with `businessErrorCode: 305`

---

## 9. Test non-admin access is blocked

```bash
# Use a CENTER_OWNER or CUSTOMER JWT:
curl http://localhost:8080/api/v1/admin/users/pending \
  -H "Authorization: Bearer <owner-jwt>"
```

Expected: `403 Forbidden`

---

## Swagger UI

All endpoints are browsable at:
`http://localhost:8080/api/v1/swagger-ui/index.html`

Use the **Authorize** button, paste `Bearer <admin-jwt>`, then test the `/admin/**` endpoints interactively.
