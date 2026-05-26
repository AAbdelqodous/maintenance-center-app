# API Contract: Diagnostic Department & Booking Re-Route

**Feature**: 022-diagnostic-and-reroute
**Base path**: `/api/v1/` (relative to the existing server context path)
**Auth**: All endpoints require `Authorization: Bearer <jwt>`. Center is resolved server-side
from the caller's active membership.

---

## Permission matrix

| Endpoint | Method | OWNER | BRANCH_MANAGER | TECHNICIAN (assigned to the booking) | TECHNICIAN (other) | CUSTOMER |
|---|---|---|---|---|---|---|
| `/centers/my/departments` | PUT (with `isDiagnostic` / `diagnosticFeeAmount`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/bookings/{id}/reroute` | POST | ✅ | ✅ | ✅ (only for the booking they are assigned to) | ❌ | ❌ |
| `/bookings/{id}/reroute-history` | GET | ✅ | ✅ | ✅ (only for the booking they are or were assigned to) | ❌ | ❌ |
| `/bookings` | POST (with `categoryId = null`) | n/a | n/a | n/a | n/a | ✅ (customer app) |

`MANAGE_ALL_STAFF` / `MANAGE_NON_MANAGER_STAFF` (per 011) cover OWNER and BRANCH_MANAGER for
department writes. The new permissions `REROUTE_BOOKING_ASSIGNED` and `REROUTE_BOOKING_ANY`
gate the re-route endpoints (added via amendment to 011 per FR-DR-032).

---

## Endpoints

### 1. PUT /centers/my/departments/{id} (EXTEND existing — 020)

Owner / branch-manager updates a department, optionally toggling the diagnostic flag or
setting the fee.

**Request body**

```json
{
  "nameAr": "تشخيص الأعطال",
  "nameEn": "Diagnostic Bay",
  "categoryIds": [],
  "displayOrder": 0,
  "isDiagnostic": true,
  "diagnosticFeeAmount": 5.000
}
```

All fields optional in a `PUT` (partial-update semantics per 020). To unset the fee, send
`"diagnosticFeeAmount": null`. To turn off the flag, send `"isDiagnostic": false` (which
the backend will reject if `diagnosticFeeAmount` was previously set — owner must clear the
fee first, or the backend can null both atomically).

**Response 200** — full `DepartmentResponse` per 020 + new fields (see [data-model.md](../data-model.md)).

**New error codes**

| Code | HTTP | When |
|---|---|---|
| `DUPLICATE_DIAGNOSTIC_DEPARTMENT` | 409 | Another active department at this center is already diagnostic. |
| `INVALID_DIAGNOSTIC_FEE_TARGET` | 400 | `diagnosticFeeAmount` set on a department where `isDiagnostic = false`. |
| `DIAGNOSTIC_TOGGLE_BLOCKED_BY_OPEN_BOOKINGS` | 409 | Tried to toggle `isDiagnostic` while the dept has non-terminal bookings. |

---

### 2. POST /bookings (EXTEND existing — make `categoryId` optional)

Customer-app endpoint. The contract change is non-breaking: existing clients always send
`categoryId` and continue to work.

**Request body** (relevant fields only)

```json
{
  "centerId": 5,
  "bookingDate": "2026-06-01",
  "bookingTime": "10:30:00",
  "categoryId": null,
  "...": "(other existing fields)"
}
```

- `categoryId` is now nullable.
- When `categoryId` is null:
  - If the center has an active diagnostic department, the booking is routed there and
    `passedThroughDiagnostic = true` on the response.
  - Otherwise the booking is routed to the default department per 020 FR-D-008 and
    `passedThroughDiagnostic = false`.

**Response 201** — `BookingResponse` with the two new fields (see [data-model.md](../data-model.md)).

No new error codes for this change; existing validation continues to apply.

---

### 3. POST /bookings/{id}/reroute (NEW)

Re-route a booking to a different department within the same center.

**Request body**

```json
{
  "targetDepartmentId": 7,
  "reason": "WRONG_DIAGNOSIS",
  "note": "Compression normal; failure pattern matches alternator"
}
```

- `targetDepartmentId` (required) — must reference an active department at the booking's
  center, and must not be the booking's current department, and must NOT be diagnostic.
- `reason` (required) — one of `WRONG_DIAGNOSIS`, `OUT_OF_SCOPE`, `SPECIALIST_NEEDED`,
  `STAFF_UNAVAILABLE`, `CUSTOMER_REQUEST`, `OTHER`.
- `note` (optional) — free text, max 500 chars.

**Response 200**

```json
{
  "audit": {
    "id": 1234,
    "bookingId": 1042,
    "fromDepartmentId": 3,
    "fromDepartmentNameAr": "تشخيص الأعطال",
    "fromDepartmentNameEn": "Diagnostic Bay",
    "toDepartmentId": 7,
    "toDepartmentNameAr": "كهرباء",
    "toDepartmentNameEn": "Electrical",
    "fromMembershipId": 88,
    "fromMembershipDisplayName": "Ali Hassan",
    "triggeredByUserId": 88,
    "triggeredByUserDisplayName": "Ali Hassan",
    "reason": "SPECIALIST_NEEDED",
    "note": "Alternator likely failing",
    "isInitialDiagnosticClassification": true,
    "createdAt": "2026-05-26T10:32:11"
  },
  "updatedBooking": {
    "id": 1042,
    "...": "(full BookingResponse with department, assignedMembershipId=null, etc.)"
  }
}
```

**Side effects**

- `booking.department` updated.
- `booking.assignedMembershipId` set to `null`.
- If a quote with status SENT or APPROVED existed, marked REVISED per 009.
- Customer notification queued (type `BOOKING_REROUTED`).

**Error codes**

| Code | HTTP | When |
|---|---|---|
| `BOOKING_NOT_FOUND` | 404 | No booking with that id, or caller has no membership at its center. |
| `FORBIDDEN_REROUTE` | 403 | Caller is not assigned to the booking AND does not have `REROUTE_BOOKING_ANY`. |
| `DEPARTMENT_NOT_FOUND` | 404 | `targetDepartmentId` not found, not active, or not at the booking's center. |
| `CANNOT_REROUTE_INTO_DIAGNOSTIC` | 400 | Target is a diagnostic department (FR-DR-017). |
| `NO_OP_REROUTE` | 400 | Target equals the booking's current department. |
| `INVALID_BOOKING_STATUS_FOR_REROUTE` | 400 | Booking is in COMPLETED, CANCELLED, or NO_SHOW. |
| `REROUTE_CONFLICT` | 409 | Pessimistic lock contention — another re-route was applied first. Body includes the current booking state for client retry. |
| `INVALID_REROUTE_REASON` | 400 | Reason not in enum. |
| `NOTE_TOO_LONG` | 400 | `note` exceeds 500 characters. |

All error responses follow the existing `BusinessErrorCode` shape:

```json
{
  "businessErrorCode": 4051,
  "businessErrorDescription": "Bookings cannot be re-routed into the diagnostic department.",
  "error": "CANNOT_REROUTE_INTO_DIAGNOSTIC",
  "validationErrors": []
}
```

The bilingual user-facing messages are resolved client-side via the existing
`businessErrorCode → i18n key` map; new keys are listed at the bottom of this document.

---

### 4. GET /bookings/{id}/reroute-history (NEW)

Returns the chronological list of re-routes for a booking.

**Query params**: none.

**Response 200**

```json
[
  {
    "id": 1234,
    "bookingId": 1042,
    "fromDepartmentId": 3,
    "fromDepartmentNameAr": "تشخيص الأعطال",
    "fromDepartmentNameEn": "Diagnostic Bay",
    "toDepartmentId": 7,
    "toDepartmentNameAr": "كهرباء",
    "toDepartmentNameEn": "Electrical",
    "fromMembershipId": 88,
    "fromMembershipDisplayName": "Ali Hassan",
    "triggeredByUserId": 88,
    "triggeredByUserDisplayName": "Ali Hassan",
    "reason": "SPECIALIST_NEEDED",
    "note": "Alternator likely failing",
    "isInitialDiagnosticClassification": true,
    "createdAt": "2026-05-26T10:32:11"
  }
]
```

Returns an empty array if the booking has never been re-routed.

**Errors**: `BOOKING_NOT_FOUND` (404) if no booking exists or caller has no read access at
its center. `FORBIDDEN` (403) if caller is a technician not assigned to the booking now or
historically (per the permission matrix).

---

### 5. Quote response — diagnostic fee line item (EXTEND 009's `BookingQuote`)

When `Booking.passedThroughDiagnostic = true` and `diagnosticFeeRateAtClaim` is set,
`QuoteService.create()` automatically prepends a line item:

```json
{
  "id": 88,
  "kind": "DIAGNOSTIC_FEE",
  "descriptionKey": "quote.diagnosticFee.label",
  "descriptionAr": null,
  "descriptionEn": null,
  "partsCost": 0.000,
  "laborCost": 5.000,
  "total": 5.000,
  "editable": false,
  "removable": false
}
```

The frontend resolves `descriptionKey` via i18n (e.g., "Diagnostic Fee" / "رسوم التشخيص").

Quote totals (subtotal, tax, total) include this line item. If the customer rejects the
overall quote, the diagnostic fee remains owed (the customer's outstanding balance equals
the diagnostic line total). The reconciliation flow is out of scope for this spec.

---

## RTK Query tag invalidation

Frontend `bookingsApi.ts` extensions:

| Endpoint | Provides | Invalidates |
|---|---|---|
| `getBooking(id)` | `Bookings` (id) | — |
| `getBookingRerouteHistory(id)` | `RerouteHistory` (id) | — |
| `rerouteBooking({ id, body })` | — | `Bookings` (id), `RerouteHistory` (id), `Queues` (target dept + source dept) |

The frontend invalidation triggers re-fetches in: the booking detail screen, the source
department's queue (booking disappears), and the target department's queue (booking appears).

---

## New i18n keys

Add to `lib/i18n/locales/en.json` and `ar.json`. Errors mirror the BusinessErrorCode names.

```
// Department editor — diagnostic fields
departments.diagnostic.toggle               "Diagnostic department" / "قسم التشخيص"
departments.diagnostic.feeLabel             "Diagnostic fee (KD)" / "رسوم التشخيص (د.ك)"
departments.diagnostic.feeHelper            "Charged when a booking is routed here for diagnosis." /
                                              "تُحتسب عند توجيه أي حجز لهذا القسم للتشخيص."

// Re-route action
reroute.action                              "Re-route booking" / "تحويل الحجز"
reroute.targetDept                          "Send to" / "إرسال إلى"
reroute.reason.label                        "Reason" / "السبب"
reroute.reason.WRONG_DIAGNOSIS              "Wrong initial diagnosis" / "تشخيص أولي خاطئ"
reroute.reason.OUT_OF_SCOPE                 "Out of this team's scope" / "خارج نطاق عمل هذا الفريق"
reroute.reason.SPECIALIST_NEEDED            "Specialist needed" / "يتطلب أخصائي"
reroute.reason.STAFF_UNAVAILABLE            "Staff unavailable" / "الفريق غير متاح"
reroute.reason.CUSTOMER_REQUEST             "Customer request" / "بناءً على طلب العميل"
reroute.reason.OTHER                        "Other" / "أخرى"
reroute.notePlaceholder                     "Optional note (max 500 chars)" / "ملاحظة اختيارية (٥٠٠ حرف كحد أقصى)"
reroute.submit                              "Confirm re-route" / "تأكيد التحويل"
reroute.history.title                       "Re-route history" / "سجل التحويلات"
reroute.history.entry                       "{{from}} → {{to}} by {{user}}" / "{{from}} → {{to}} بواسطة {{user}}"
reroute.history.diagnosticClassification    "Diagnostic classification" / "تصنيف التشخيص"

// Re-route errors
errors.reroute.cannotIntoDiagnostic         "Bookings cannot be re-routed into the diagnostic department." /
                                              "لا يمكن تحويل الحجز إلى قسم التشخيص."
errors.reroute.noOp                         "Cannot re-route to the same department." / "لا يمكن التحويل لنفس القسم."
errors.reroute.terminalStatus               "This booking cannot be re-routed in its current status." /
                                              "لا يمكن تحويل هذا الحجز في وضعه الحالي."
errors.reroute.conflict                     "Another change was applied to this booking. Refresh and try again." /
                                              "تم تطبيق تغيير آخر على هذا الحجز. حدث الصفحة وحاول مجددًا."
errors.reroute.forbidden                    "You don't have permission to re-route this booking." /
                                              "ليس لديك صلاحية تحويل هذا الحجز."

// Quote — diagnostic fee line
quote.diagnosticFee.label                   "Diagnostic Fee" / "رسوم التشخيص"
quote.diagnosticFee.tooltip                 "Charged for the time spent diagnosing the issue. Owed regardless of repair approval." /
                                              "تُحتسب مقابل وقت تشخيص العطل. مستحقة بغض النظر عن الموافقة على الإصلاح."

// Customer notification (consumed by customer-app)
notifications.bookingRerouted.title         "Booking updated" / "تم تحديث الحجز"
notifications.bookingRerouted.body          "Our team has updated your booking. Estimated start time: {{time}}." /
                                              "قام فريقنا بتحديث حجزك. وقت البدء المتوقع: {{time}}."
notifications.bookingRerouted.reviseQuote   "A revised quote will be sent to you. Please review it before work continues." /
                                              "سيتم إرسال عرض سعر مُحدث. يُرجى مراجعته قبل استكمال العمل."
```
