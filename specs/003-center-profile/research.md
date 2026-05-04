# Research: Phase 3 — Center Profile Management

**Branch**: `phase-3-center-profile` | **Date**: 2026-04-02 | **Status**: ✅ Implemented

---

## Decision 1: Form State Management — React Hook Form + Zod

**Decision**: React Hook Form with `zodResolver` for all profile forms.

**Rationale**:
- Profile form has many fields (bilingual names, address fields, opening/closing time, description) — uncontrolled RHF avoids re-renders per keystroke.
- Zod schema enforces cross-field validation (e.g. `closingTime` must be after `openingTime`) in a single `.refine()` call.
- `useForm` `defaultValues` populated from RTK Query `data` once loaded — no separate state sync needed.

---

## Decision 2: Bilingual Address — Separate Fields, Not a Single String

**Decision**: Each address component has `Ar` and `En` variants: `cityAr`, `cityEn`, `districtAr`, `districtEn`, `streetAr`, `streetEn`, `governorateAr`, `governorateEn`.

**Rationale**:
- Backend `Address` is `@Embeddable` with `cityAr`/`cityEn` pairs — a single `city` field does not exist.
- UI shows both fields side by side or in separate tabs (Arabic / English).
- Consistent with the project-wide bilingual pattern for all user-facing string fields.

---

## Decision 3: Image Upload — Multipart to a Dedicated Endpoint

**Decision**: `POST /centers/my/images` with `multipart/form-data`; separate from the profile PUT.

**Rationale**:
- Keeps the main `PUT /centers/my` body JSON-only (simpler validation).
- `expo-image-picker` returns a `uri`; upload builds `FormData` with a single `file` field.
- Backend returns the updated `MaintenanceCenterResponse` with the new `imageUrl`.
- `invalidatesTags: ['CenterProfile', 'CenterImages']` ensures gallery refreshes.

---

## Decision 4: Opening Time Input — Text Input, Not a Picker

**Decision**: Plain text input accepting `HH:mm` format, stored and sent as `HH:mm:ss`.

**Rationale**:
- Native time pickers differ significantly between iOS/Android/web — inconsistent UX.
- Center owners set fixed hours rarely (once during setup); a simple validated text field is sufficient.
- Zod validates format with regex `/^\d{2}:\d{2}$/`; `:ss` appended before sending.

---

## Decision 5: Category Selection — Multi-Select Toggle List

**Decision**: `GET /categories` fetched once (no pagination needed — only ~6 items); rendered as a toggle list of chips/buttons.

**Rationale**:
- ServiceCategory list is small and stable (seeded with 6 rows).
- `transformResponse` handles both plain array and `Page` wrapper from backend.
- Selected category IDs stored in `useForm` as `categoryIds: number[]`.
- `invalidatesTags: ['CenterProfile']` on update keeps profile in sync.

---

## Decision 6: Setup Center Screen — First-Time Profile Creation

**Decision**: `app/(app)/setup-center.tsx` shown when `GET /centers/my/profile` returns 404 (center not yet created).

**Rationale**:
- New OWNER accounts may not have a center profile yet.
- `(app)/_layout.tsx` checks for 404 on session restore and redirects to `setup-center`.
- Same form as profile editor but uses `POST /centers/my` instead of `PUT /centers/my`.

---

## Resolved Clarifications

- ✅ Form library: React Hook Form + Zod
- ✅ Bilingual address: always `Ar`/`En` field pairs
- ✅ Image upload: multipart to `/centers/my/images`
- ✅ Time input: text field with `HH:mm` validation
- ✅ Category selection: multi-select toggle from `/categories`
- ✅ First-time setup: separate `setup-center.tsx` on 404
