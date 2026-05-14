# Feature Specification: My Services Screen — Owner Declares Services & Pricing

**Feature Branch**: `014-owner-services-pricing`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: Owner declares which services their center performs, grouped by category, with optional pricing and bilingual descriptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Offered Services (Priority: P1)

A center owner opens the Services screen and sees all their active service offerings, grouped by category, with the price range (or "Price on request") and typical duration displayed for each.

**Why this priority**: This is the foundation of the feature. Without a working list view, the add/edit/delete flows have nowhere to land. It also delivers immediate value to owners who want to review what they've configured.

**Independent Test**: Log in as an owner with at least one active service offering → open Services tab → confirm offerings appear grouped by category with correct names, prices, and durations.

**Acceptance Scenarios**:

1. **Given** an owner has two active services across two categories, **When** they open the Services screen, **Then** both categories appear as sections, each containing its respective service card with name, price range (or "Price on request"), and duration.
2. **Given** an owner has no services configured yet, **When** they open the Services screen, **Then** a friendly empty state is shown with a prominent "Add your first service" call-to-action.
3. **Given** an owner's services include one without pricing, **When** they view the list, **Then** that card shows "Price on request" instead of a price range.

---

### User Story 2 — Add a New Service Offering (Priority: P1)

An owner adds a new service their center performs by choosing a category, then choosing a specific service within that category, then optionally entering pricing and bilingual descriptions.

**Why this priority**: The list screen is only useful if the owner can populate it. Adding a service is the core write operation.

**Independent Test**: Start from the Services tab empty state or the "+" button → complete the 3-step add flow → confirm the new offering appears in the list under the correct category.

**Acceptance Scenarios**:

1. **Given** the owner is on step 1 (category), **When** they select a category, **Then** step 2 shows only the services valid for that category, with already-offered services visibly disabled (not hidden).
2. **Given** the owner reaches step 3 (pricing), **When** they enter a min price but the max price is less than the min price, **Then** submission is blocked and a validation message is shown.
3. **Given** the owner completes all three steps with valid data, **When** they submit, **Then** the new offering appears immediately in the Services list under the correct category.
4. **Given** the owner skips all pricing fields on step 3, **When** they submit, **Then** the offering is saved with null pricing and displays as "Price on request".
5. **Given** an owner tries to add a service already offered under the same category, **When** they reach step 2, **Then** that service is shown as disabled and cannot be selected.

---

### User Story 3 — Edit an Existing Service Offering (Priority: P2)

An owner edits the pricing, typical duration, or bilingual description of one of their service offerings. The service identity (which category and which service type) cannot be changed on the edit screen.

**Why this priority**: Pricing changes are frequent. The edit flow is high-value but secondary to being able to add services in the first place.

**Independent Test**: Tap an existing service card → enter the edit screen → change the max price → save → confirm the list card reflects the new price.

**Acceptance Scenarios**:

1. **Given** the owner opens the edit screen for an existing offering, **When** the screen loads, **Then** the category and service name are shown as read-only labels, and all pricing/description fields are pre-filled with current values.
2. **Given** the owner clears both min and max price and saves, **When** the offering is saved, **Then** it displays as "Price on request".
3. **Given** the owner enters a max price lower than the min price, **When** they attempt to save, **Then** submission is blocked with a clear validation message.
4. **Given** the owner changes only the Arabic description and saves, **When** the list is reloaded, **Then** the updated Arabic description is reflected.

---

### User Story 4 — Remove a Service Offering (Priority: P2)

An owner removes a service their center no longer performs. The removal is a soft delete — the offering is hidden from their list and will no longer appear on customer-facing displays.

**Why this priority**: Without delete, the list grows stale and owners lose trust in the tool.

**Independent Test**: Trigger the delete action on a service card → confirm the deletion prompt → confirm the service disappears from the list.

**Acceptance Scenarios**:

1. **Given** an owner triggers the delete action on a service card, **When** they confirm the deletion, **Then** the service disappears from the list and the category section is removed if it was the only service in that category.
2. **Given** an owner triggers delete but then cancels the confirmation, **When** they return to the list, **Then** the service remains unchanged.
3. **Given** the last service in a category is deleted, **When** the list refreshes, **Then** the category section header is no longer shown.

---

### User Story 5 — Profile Reflects Derived Categories (Priority: P3)

The center's profile editor no longer has a categories multi-select. Instead, it shows a read-only "Categories you serve" section derived from the owner's active service offerings, with a "Manage services →" navigation link.

**Why this priority**: This is a consequential UX change that removes a competing source of truth. It lands last, after the Services screen is functional, so owners always have a way to manage their offerings.

**Independent Test**: Add a service under a new category in the Services screen → return to the Profile editor → confirm the new category appears in the read-only "Categories you serve" section.

**Acceptance Scenarios**:

1. **Given** the profile editor previously showed a categories multi-select, **When** the owner opens the profile editor, **Then** no multi-select is visible and a read-only "Categories you serve" list is shown instead.
2. **Given** the owner has services in two categories, **When** they view the profile editor, **Then** both categories appear in the "Categories you serve" section.
3. **Given** the "Manage services →" link is tapped, **When** navigation completes, **Then** the owner is taken to the Services list screen.

---

### Edge Cases

- What happens when the network fails during the add flow after step 2? The form data must be preserved so the owner does not lose their input; a retry option is shown.
- How does the system handle a service that becomes inactive in the catalog (admin disables it) while an owner already has it offered? The existing offering remains visible to the owner; only new additions of that service are blocked.
- What if the owner submits the add form twice in rapid succession? The server's unique constraint rejects the duplicate; the client shows the server error message.
- What if both Arabic and English descriptions are left empty? That is valid — descriptions are fully optional.
- What if a category has all available services already offered by this center? The category still appears in step 1, but step 2 shows all services as disabled.
- What if the owner's session expires mid-flow on the add screen? Standard 401 handling applies: redirect to login; on return the flow starts from the beginning.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Owners MUST be able to view all their active service offerings on a single screen, grouped by service category, with each offering showing: service name (in the current locale), price range formatted as "X.XXX–Y.YYY KD" or "Price on request", and typical duration in minutes (if set).
- **FR-002**: Owners MUST be able to add a new service offering through a guided three-step flow: (1) choose a service category, (2) choose a service within that category, (3) optionally enter pricing and bilingual description.
- **FR-003**: In step 2 of the add flow, services the owner already offers under the selected category MUST be displayed as visually disabled (not hidden) so the owner understands why they are not selectable.
- **FR-004**: Owners MUST be able to edit the pricing (min/max KD), typical duration (minutes), Arabic description, and English description of an existing offering. The category and service identity MUST be presented as read-only on the edit screen.
- **FR-005**: Owners MUST be able to soft-delete a service offering. After deletion, it disappears from the owner's list and from customer-facing displays. A confirmation step is required before deletion proceeds.
- **FR-006**: The system MUST prevent saving an offering where a max price is provided and is less than the min price, both at the client (immediate inline feedback) and relying on server validation as a safety net.
- **FR-007**: Price values MUST accept up to 3 decimal places (Kuwaiti Dinar fils precision) and MUST be displayed as "X.XXX KD".
- **FR-008**: Bilingual description fields (Arabic and English) MUST be independently optional. Each MUST enforce a 500-character maximum with a visible character counter.
- **FR-009**: The profile editor MUST NOT expose a categories multi-select. It MUST instead show a read-only "Categories you serve" section populated from the owner's active service offerings, plus a "Manage services →" navigation link to the Services screen.
- **FR-010**: The Services list screen MUST display a friendly empty state with a clear call-to-action when the owner has no active offerings.
- **FR-011**: All owner-facing UI text MUST be available in both Arabic and English, switching with the app locale. Owner-authored bilingual description content is independent: either, both, or neither language may be filled.
- **FR-012**: All interactive touch targets MUST meet minimum size requirements for comfortable mobile use (no smaller than 44×44 points).
- **FR-013**: The service catalog is admin-curated and read-only for owners. The add flow offers no free-text service creation; owners select from the existing catalog only.
- **FR-014**: Delete confirmations on the web variant of the app MUST use a web-compatible confirmation mechanism (not a native multi-button alert dialog).

### Key Entities

- **Service Category**: A grouping label for related services. Each category has bilingual names (Arabic and English). A center's active categories are derived solely from its active service offerings — there is no independent category selection.
- **Service (Catalog Entry)**: A global, admin-curated service type. Has a code, bilingual name and description, an optional icon, and an active flag. A service belongs to one or more categories. Owners cannot create or modify catalog entries.
- **Center Service Offering**: The record linking a center to a specific (category, service) pair. Carries optional pricing (minimum and maximum amounts in KD), optional typical duration in minutes, and optional bilingual description authored by the owner. The combination of (center, category, service) is unique — no two active offerings for the same center may share the same category and service.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Owners can view their full list of offered services, correctly grouped by category, within 2 seconds of opening the Services screen on a standard mobile data connection.
- **SC-002**: Owners can complete the end-to-end flow of adding a new service (including optional pricing) in under 2 minutes from tapping the add button to seeing the result in the list.
- **SC-003**: Invalid pricing (max price less than min price) is caught and communicated to the owner before any network request is made — zero server round-trips for this validation error.
- **SC-004**: After adding or deleting a service, the profile editor's "Categories you serve" section reflects the change without requiring manual refresh or re-login.
- **SC-005**: All three screens (list, add, edit) render correctly and are fully usable in both Arabic (RTL) and English (LTR) locales.
- **SC-006**: Every delete action requires explicit owner confirmation before proceeding; no offering is removed without a confirmation step.
- **SC-007**: The web variant of the app handles delete confirmation without relying on multi-button native alert dialogs, and all screens function in a web browser.

## Assumptions

- The service catalog (7 services across categories) is seeded and active in the backend prior to this feature's deployment. This spec makes no changes to catalog content or structure.
- Soft-deleted offerings cannot be restored through the app in this phase. Re-adding the same (category, service) combination creates a new offering record.
- "Price on request" is the sole display label for an offering with null pricing. Displaying "0.000 KD" for null pricing is incorrect behavior.
- The uniqueness constraint (center, category, service) is enforced both in the client (disabled UI in step 2) and on the server. Client-side enforcement is for user experience; server-side is the authoritative constraint.
- Duration is expressed in whole minutes only. Sub-minute precision is not required.
- Bilingual description fields are fully optional and independent. Providing one without the other is valid and does not trigger a validation error.
- The "Manage services" link in the profile editor, alongside the new Services tab entry, is sufficient for discoverability. No additional onboarding flow or tooltip is required.
- This feature does not ship to production before the corresponding backend endpoints are deployed. Development and component testing may proceed against a local backend or mocked responses.
- The app targets center owners only. Customer-facing display of service offerings is out of scope and is owned by a separate customer-facing application.
