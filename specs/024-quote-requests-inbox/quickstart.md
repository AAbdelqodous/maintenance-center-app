# Quickstart: Quote Requests Inbox & Bidding (Owner)

**Branch**: `024-quote-requests-inbox`
**Date**: 2026-05-29

---

## Prerequisites

- Center app builds and runs (feature-complete for prior phases).
- `004-service-catalog` + `014-owner-services-pricing` — covered categories + pricing (pre-fill).
- `003-center-profile` — service area (matching).
- `011-center-staff-permissions` — gating (new `RESPOND_TO_QUOTES`).
- `009-work-progress-quotes` (quote shape), `016-attention-required-panel` (Attention integration).
- Pairs with customer `009-get-quotes-marketplace` (same backend `quoterequest` domain). End-to-end:
  the customer broadcasts/accepts, this app receives/quotes.

Verify reuse points:
```bash
cd ~/MaintenanceCenter/maintenance-center-app
grep -n "RESPOND_TO_QUOTES" types/staff.ts        # added by this feature (T003)
grep -n "NEW_QUOTE_REQUEST" types/attention.ts     # added by this feature (T004)
grep -n "export function formatKD" lib/utils/pricing.ts  # reused (must exist)
```

---

## New packages

**None.** Reuses `chatApi`, `pricingApi` (suggested price), `staffApi` (permissions), the Attention
panel, and `lib/utils/pricing.ts → formatKD`.

---

## Environment Setup

No new frontend env vars.
```bash
# .env (already configured)
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1
```

---

## Backend Requirements

| Endpoint | Status | Required for |
|----------|--------|--------------|
| `GET /centers/my/quote-requests` | **Not yet implemented** | Inbox |
| `GET /quote-requests/{id}` (center view) | **Not yet implemented** | Request detail |
| `POST /quote-requests/{id}/quote` | **Not yet implemented** | Submit/edit quote |
| `DELETE /quote-requests/{id}/quote` | **Not yet implemented** | Withdraw |
| `POST /quote-requests/{id}/chat` | **Not yet implemented** | Message customer |
| `GET|PUT /centers/my/lead-preferences` | **Not yet implemented** | Preferences |
| `GET /centers/my/lead-metrics` | **Not yet implemented** | Metrics |
| Matching + won/lost events (server) | **Not yet implemented** | Inbox + outcomes |

See `contracts/quote-requests-inbox-api.md` for exact shapes.

**Develop without the backend (stub):** `GET /centers/my/quote-requests` → 2–3 `InboxItem`s
(`myResponseStatus: NONE`); `GET /quote-requests/{id}` → detail with `myResponse: null`;
`POST …/quote` → `SUBMITTED`; flip `requestStatus`/`myResponseStatus` to `ACCEPTED`/`SELECTED` to
exercise the won path; verified `LeadPreferences` + `LeadMetrics`.

---

## Running the App

```bash
npx expo start --web      # fastest for inbox + quote form
npx expo start            # native (a/i)
```

---

## New files to create

```
types/quoteRequests.ts
store/api/quoteRequestsApi.ts
components/quoteRequests/InboxItem.tsx
components/quoteRequests/QuoteResponseForm.tsx
app/(app)/(tabs)/quote-requests/_layout.tsx
app/(app)/(tabs)/quote-requests/index.tsx
app/(app)/(tabs)/quote-requests/[id].tsx
app/(app)/(tabs)/quote-requests/preferences.tsx
```

## Files to modify

```
types/staff.ts                       # add 'RESPOND_TO_QUOTES' to CenterPermission + ROLE_PERMISSIONS (OWNER/BRANCH_MANAGER/RECEPTIONIST)
types/attention.ts                   # add 'NEW_QUOTE_REQUEST' to AttentionCategory + ATTENTION_CATEGORY_ORDER
store/index.ts                       # register quoteRequestsApi
app/(app)/(tabs)/profile/index.tsx   # "Quote Requests" entry (gated by RESPOND_TO_QUOTES)
app/(app)/(tabs)/_layout.tsx         # register quote-requests routes (href:null, not a tab)
lib/i18n/locales/en.json             # quoteRequests.* keys
lib/i18n/locales/ar.json             # mirror
```

---

## Smoke test (happy paths)

1. **Receive + respond** — with the center opted in (preferences) and a customer (or stub) broadcasting a
   matching request, it appears in the inbox + Attention panel → open it → submit a quote (price/range,
   duration, inclusions) → `myResponseStatus` becomes SUBMITTED.
2. **Pre-fill** — open a request whose service has `014` pricing → the form pre-fills a suggested price.
3. **Win → booking** — customer accepts this center (stub `SELECTED`) → "you won" notification → a booking
   appears in the bookings list and enters the normal pipeline.
4. **Lost** — another center wins (stub `NOT_SELECTED`) → notification; request leaves the active inbox.
5. **Preferences + quiet hours** — opt in, choose categories/areas, set quiet hours → a matching request
   during quiet hours appears in the inbox but pushes no notification.
6. **Edit / withdraw** — change the quoted price before acceptance (customer notified); withdraw an open
   quote → removed from the customer's request.
7. **Metrics** — view received/responded/won/win-rate/avg-response for a range.
8. **Permissions** — TECHNICIAN (no `RESPOND_TO_QUOTES`) cannot see the inbox/quote form; OWNER/MANAGER/
   RECEPTIONIST can.

---

## Verification checklist

- [ ] Inbox shows only matching requests from the backend (no client-side matching, no competitor data).
- [ ] One quote per center — a second staff submitting edits the same quote (no duplicate).
- [ ] Prices via `formatKD` (3 decimals); fixed price shows once when min == max.
- [ ] New request → `NEW_QUOTE_REQUEST` Attention item; push suppressed during quiet hours.
- [ ] Submit/edit/withdraw gated by `RESPOND_TO_QUOTES`; preferences by `EDIT_CENTER_PROFILE`; metrics by `VIEW_REPORTS`.
- [ ] Won → booking in the normal pipeline; expiry counts against response rate, not win rate.
- [ ] Multi-branch: switching `activeCenterId` swaps the inbox; no cross-branch lead pooling.
- [ ] RTL spot-check: inbox rows, quote form, preferences, metrics.
- [ ] Request-scoped chat reachable; continues under the booking after win, read-only after expiry.
